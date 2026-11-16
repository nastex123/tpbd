"""Unit tests for SeriesService normalization and caching."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.series_service import SeriesService
from app.schemas.catalog import DataSourceProvider


@pytest.fixture
def mock_dependencies():
    power_client = MagicMock()
    cache_repo = MagicMock()
    catalog_service = MagicMock()
    region_repo = MagicMock()

    # Mock catalog variable
    var_mock = MagicMock()
    var_mock.variable_id = "T2M"
    var_mock.unit = "°C"
    var_mock.provider = DataSourceProvider.NASA_POWER
    var_mock.data_community = "AG (Agroclimatology)"
    catalog_service.get_variable_by_id.return_value = var_mock

    return power_client, cache_repo, catalog_service, region_repo


def test_normalize_power_payload_filters_month_13_and_handles_missing(mock_dependencies):
    """Verify month 13 is discarded and -999 fill values become null with quality='missing'."""
    power_client, cache_repo, catalog_service, region_repo = mock_dependencies
    service = SeriesService(power_client, cache_repo, catalog_service, region_repo)

    raw_payload = {
        "properties": {
            "parameter": {
                "T2M": {
                    "202301": 25.5,
                    "202302": -999.0,
                    "202303": 26.2,
                    "202313": 25.8,  # Annual average must be discarded
                }
            }
        }
    }

    res = service._normalize_power_payload(
        raw_data=raw_payload,
        variable_id="T2M",
        lat=-3.1,
        lon=-60.0,
        start_year=2023,
        end_year=2023,
        location_name="Amazon Basin",
        unit="°C",
        provider=DataSourceProvider.NASA_POWER,
    )

    assert res.sample_count == 3  # Only Jan, Feb, Mar (month 13 excluded)
    assert res.valid_count == 2
    assert res.missing_count == 1

    dates = [p.date for p in res.points]
    assert "2023-13" not in dates
    assert dates == ["2023-01", "2023-02", "2023-03"]

    assert res.points[0].value == 25.5
    assert res.points[0].quality == "observed"

    assert res.points[1].value is None
    assert res.points[1].quality == "missing"


@pytest.mark.asyncio
async def test_get_time_series_cache_hit(mock_dependencies):
    """Verify service returns cached series immediately on cache hit without calling upstream."""
    power_client, cache_repo, catalog_service, region_repo = mock_dependencies
    service = SeriesService(power_client, cache_repo, catalog_service, region_repo)

    cached_data = {
        "variable_id": "T2M",
        "unit": "°C",
        "provider": "NASA_POWER",
        "location_name": "Amazon Basin",
        "query_coordinates": {"latitude": -3.1, "longitude": -60.0},
        "representative_grid_cell": "-3.1, -60.0 (0.5° grid)",
        "spatial_resolution": "0.5° x 0.5° (~50 km)",
        "temporal_range": "2023-01 to 2023-12",
        "sample_count": 1,
        "valid_count": 1,
        "missing_count": 0,
        "is_cached": False,
        "points": [{"date": "2023-01", "value": 26.0, "quality": "observed"}],
    }
    cache_repo.get_series.return_value = cached_data

    res = await service.get_time_series("T2M", -3.1, -60.0, 2023, 2023, location_name="Amazon Basin")

    assert res.is_cached is True
    assert res.sample_count == 1
    power_client.fetch_monthly_point.assert_not_called()


def test_validate_series_compatibility(mock_dependencies):
    """Verify compatibility check rejects series with incompatible units (CA-05)."""
    from app.schemas.series import TimeSeriesResponse
    from app.core.exceptions import AppException

    series_temp = TimeSeriesResponse(
        variable_id="T2M",
        unit="°C",
        provider=DataSourceProvider.NASA_POWER,
        location_name="Amazon",
        query_coordinates={"latitude": -3.1, "longitude": -60.0},
        representative_grid_cell="-3.1, -60.0",
        spatial_resolution="0.5°",
        temporal_range="2020-01 to 2020-12",
        sample_count=1,
        valid_count=1,
        missing_count=0,
        is_cached=False,
        points=[],
    )

    series_precip = TimeSeriesResponse(
        variable_id="PRECTOTCORR",
        unit="mm/month",
        provider=DataSourceProvider.NASA_POWER,
        location_name="Amazon",
        query_coordinates={"latitude": -3.1, "longitude": -60.0},
        representative_grid_cell="-3.1, -60.0",
        spatial_resolution="0.5°",
        temporal_range="2020-01 to 2020-12",
        sample_count=1,
        valid_count=1,
        missing_count=0,
        is_cached=False,
        points=[],
    )

    # Compatible (comparing two temperature series)
    SeriesService.validate_series_compatibility(series_temp, series_temp)

    # Incompatible (comparing temperature with precipitation)
    with pytest.raises(AppException) as exc_info:
        SeriesService.validate_series_compatibility(series_temp, series_precip)
    assert exc_info.value.status_code == 400
    assert "Incompatible Series Units" in exc_info.value.title

