"""Integration tests for /api/v1/series endpoints."""
from unittest.mock import AsyncMock, patch
from app.clients.power_client import PowerClient


def test_get_series_with_region_id_and_cache(client):
    """Verify querying series by region_id returns 200 and subsequent call hits SQLite cache."""
    mock_power_payload = {
        "properties": {
            "parameter": {
                "T2M": {
                    "202001": 26.5,
                    "202002": 26.8,
                    "202013": 26.65,  # Annual average
                }
            }
        }
    }

    with patch.object(PowerClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_power_payload

        # 1. First call: Cache miss -> upstream call
        response = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2020&end_year=2020")
        assert response.status_code == 200
        data = response.json()

        assert data["variable_id"] == "T2M"
        assert data["location_name"] == "Amazon Basin (Manaus)"
        assert data["sample_count"] == 2
        assert data["valid_count"] == 2
        assert data["missing_count"] == 0
        assert data["is_cached"] is False
        assert len(data["points"]) == 2
        assert data["points"][0]["date"] == "2020-01"
        assert data["points"][0]["value"] == 26.5

        # 2. Second call: Cache hit -> no upstream call
        mock_fetch.reset_mock()
        cached_res = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2020&end_year=2020")
        assert cached_res.status_code == 200
        cached_data = cached_res.json()
        assert cached_data["is_cached"] is True
        mock_fetch.assert_not_called()


def test_get_series_with_custom_coordinates(client):
    """Verify querying series with explicit lat and lon coordinates."""
    mock_power_payload = {
        "properties": {
            "parameter": {
                "PRECTOTCORR": {
                    "202101": 12.3,
                    "202102": -999.0,
                }
            }
        }
    }

    with patch.object(PowerClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_power_payload
        response = client.get("/api/v1/series?variable_id=PRECTOTCORR&lat=11.5&lon=-72.9&start_year=2021&end_year=2021")
        assert response.status_code == 200
        data = response.json()

        assert data["variable_id"] == "PRECTOTCORR"
        assert data["sample_count"] == 2
        assert data["valid_count"] == 1
        assert data["missing_count"] == 1
        assert data["points"][1]["value"] is None
        assert data["points"][1]["quality"] == "missing"


def test_get_series_missing_coordinates(client):
    """Verify 400 Bad Request when neither region_id nor lat/lon are supplied."""
    response = client.get("/api/v1/series?variable_id=T2M")
    assert response.status_code == 400
    problem = response.json()
    assert problem["title"] == "Missing Geographic Coordinates"
    assert problem["status"] == 400
    assert "invalid_params" in problem


def test_get_series_invalid_temporal_range(client):
    """Verify 400 Bad Request when start_year > end_year."""
    response = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2025&end_year=2020")
    assert response.status_code == 400
    problem = response.json()
    assert problem["title"] == "Invalid Temporal Range"
    assert problem["status"] == 400


def test_get_series_not_found_region_or_variable(client):
    """Verify 404 Not Found for non-existent variable or region."""
    # Unknown region
    res1 = client.get("/api/v1/series?variable_id=T2M&region_id=atlantis")
    assert res1.status_code == 404
    assert res1.json()["title"] == "Resource Not Found"

    # Unknown variable
    res2 = client.get("/api/v1/series?variable_id=NONEXISTENT&region_id=amazon")
    assert res2.status_code == 404
    assert res2.json()["title"] == "Resource Not Found"


def test_get_series_offline_mode_and_fallback(client):
    """Verify offline=true serves from cache and upstream failure triggers fallback to cache."""
    mock_payload = {
        "properties": {
            "parameter": {
                "T2M": {"202001": 26.5}
            }
        }
    }

    # 1. Populate cache
    with patch.object(PowerClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_payload
        init_res = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2020&end_year=2020")
        assert init_res.status_code == 200

    # 2. Test explicit offline=true query
    with patch.object(PowerClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch:
        offline_res = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2020&end_year=2020&offline=true")
        assert offline_res.status_code == 200
        assert offline_res.json()["is_cached"] is True
        mock_fetch.assert_not_called()

    # 3. Test offline=true when nothing is cached -> 404
    uncached_res = client.get("/api/v1/series?variable_id=PRECTOTCORR&region_id=sahel&offline=true")
    assert uncached_res.status_code == 404

    # 4. Test upstream network failure triggers automatic cache fallback
    from app.core.exceptions import NASAUpstreamTimeoutError
    with patch.object(PowerClient, "fetch_monthly_point", side_effect=NASAUpstreamTimeoutError()):
        # Query amazon T2M with different year where upstream fails: falls back to cached series
        fallback_res = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&start_year=2021&end_year=2021")
        assert fallback_res.status_code == 200
        assert fallback_res.json()["is_cached"] is True
