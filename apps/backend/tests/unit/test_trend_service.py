"""Unit tests for TrendService Seasonal Mann-Kendall and Sen's slope engine."""
import numpy as np
import pytest
from unittest.mock import MagicMock
from app.services.trend_service import TrendService
from app.schemas.analytics import (
    TrendAnalysisRequest,
    TrendDirection,
    RegionalComparisonRequest,
    RegionalLocationPoints,
)
from app.schemas.series import DataPoint


@pytest.fixture
def mock_catalog_service():
    service = MagicMock()
    var_mock = MagicMock()
    var_mock.variable_id = "T2M"
    var_mock.unit = "°C"
    service.get_variable_by_id.return_value = var_mock
    return service


def generate_monthly_points(
    start_year: int,
    num_years: int,
    slope_per_month: float = 0.0,
    noise_std: float = 0.0,
    seasonal_amplitude: float = 0.0,
    missing_indices: list[int] | None = None,
) -> list[DataPoint]:
    """Helper to synthesize test monthly series."""
    points = []
    missing_set = set(missing_indices or [])
    idx = 0
    np.random.seed(42)

    for y in range(start_year, start_year + num_years):
        for m in range(1, 13):
            date_str = f"{y:04d}-{m:02d}"
            if idx in missing_set:
                points.append(DataPoint(date=date_str, value=None, quality="missing"))
            else:
                season = seasonal_amplitude * np.sin(2 * np.pi * (m - 1) / 12)
                noise = np.random.normal(0, noise_std) if noise_std > 0 else 0.0
                val = 20.0 + (idx * slope_per_month) + season + noise
                points.append(DataPoint(date=date_str, value=round(float(val), 3), quality="observed"))
            idx += 1
    return points


def test_trend_service_increasing_significant(mock_catalog_service):
    """Verify strong warming trend is identified as increasing_significant with positive Sen slope and CI."""
    service = TrendService(mock_catalog_service)
    # 10 years (120 months) with +0.05°C/month (+6.0°C/decade) + seasonal cycle
    points = generate_monthly_points(2010, 10, slope_per_month=0.05, seasonal_amplitude=2.0)

    req = TrendAnalysisRequest(variable_id="T2M", points=points, alpha=0.05)
    res = service.analyze_trend(req)

    assert res.direction == TrendDirection.INCREASING_SIGNIFICANT
    assert res.p_value < 0.01
    assert res.rate_per_decade is not None
    assert 5.0 <= res.rate_per_decade <= 7.0
    assert res.rate_unit == "°C/decade"
    assert res.confidence_interval_95 is not None
    assert res.confidence_interval_95[0] > 0.0  # Lower bound must be positive
    assert "Statistically significant increasing trend" in res.plain_language_verdict


def test_trend_service_decreasing_significant(mock_catalog_service):
    """Verify negative slope is classified as decreasing_significant."""
    service = TrendService(mock_catalog_service)
    # 10 years with -0.04/month
    points = generate_monthly_points(2010, 10, slope_per_month=-0.04, seasonal_amplitude=1.5)

    req = TrendAnalysisRequest(variable_id="T2M", points=points, alpha=0.05)
    res = service.analyze_trend(req)

    assert res.direction == TrendDirection.DECREASING_SIGNIFICANT
    assert res.p_value < 0.05
    assert res.rate_per_decade is not None
    assert res.rate_per_decade < 0.0
    assert res.confidence_interval_95[1] < 0.0  # Upper bound must be negative


def test_trend_service_no_significant_trend(mock_catalog_service):
    """Verify white noise with zero slope results in no_significant_trend."""
    service = TrendService(mock_catalog_service)
    points = generate_monthly_points(2010, 10, slope_per_month=0.0, noise_std=2.0, seasonal_amplitude=1.0)

    req = TrendAnalysisRequest(variable_id="T2M", points=points, alpha=0.05)
    res = service.analyze_trend(req)

    assert res.direction == TrendDirection.NO_SIGNIFICANT_TREND
    assert res.p_value >= 0.05
    assert "No statistically significant trend detected" in res.plain_language_verdict


def test_trend_service_insufficient_samples(mock_catalog_service):
    """Verify sample size < 24 points returns NOT_EVALUABLE with reason."""
    service = TrendService(mock_catalog_service)
    # Only 1 year (12 points)
    points = generate_monthly_points(2020, 1, slope_per_month=0.1)

    req = TrendAnalysisRequest(variable_id="T2M", points=points)
    res = service.analyze_trend(req)

    assert res.direction == TrendDirection.NOT_EVALUABLE
    assert res.rate_per_decade is None
    assert res.p_value is None
    assert "Insufficient sample size" in res.plain_language_verdict


def test_trend_service_zero_variance(mock_catalog_service):
    """Verify constant flat series returns NOT_EVALUABLE without errors."""
    service = TrendService(mock_catalog_service)
    points = [DataPoint(date=f"2020-{m:02d}", value=25.0, quality="observed") for m in range(1, 13)]
    points += [DataPoint(date=f"2021-{m:02d}", value=25.0, quality="observed") for m in range(1, 13)]

    req = TrendAnalysisRequest(variable_id="T2M", points=points)
    res = service.analyze_trend(req)

    assert res.direction == TrendDirection.NOT_EVALUABLE
    assert "Zero variance detected" in res.plain_language_verdict


def test_trend_service_handles_missing_values(mock_catalog_service):
    """Verify series with scattered missing/null observations is evaluated correctly."""
    service = TrendService(mock_catalog_service)
    # 10 years (120 points) with some nulls
    points = generate_monthly_points(
        2010, 10, slope_per_month=0.05, seasonal_amplitude=1.0, missing_indices=[5, 12, 18, 44]
    )

    req = TrendAnalysisRequest(variable_id="T2M", points=points)
    res = service.analyze_trend(req)

    assert res.valid_count == 116
    assert res.sample_count == 120
    assert res.direction == TrendDirection.INCREASING_SIGNIFICANT


def test_regional_comparison(mock_catalog_service):
    """Verify comparative analysis contrasts two regions accurately."""
    service = TrendService(mock_catalog_service)
    # Region A: warming (+0.05/month)
    points_a = generate_monthly_points(2010, 10, slope_per_month=0.05, seasonal_amplitude=1.0)
    # Region B: cooling (-0.05/month)
    points_b = generate_monthly_points(2010, 10, slope_per_month=-0.05, seasonal_amplitude=1.0)

    req = RegionalComparisonRequest(
        variable_id="T2M",
        region_a=RegionalLocationPoints(location_name="Amazon Basin", points=points_a),
        region_b=RegionalLocationPoints(location_name="Southern Oceans", points=points_b),
    )

    comp_res = service.compare_regional_trends(req)

    assert comp_res.are_comparable is True
    assert comp_res.trend_region_a.direction == TrendDirection.INCREASING_SIGNIFICANT
    assert comp_res.trend_region_b.direction == TrendDirection.DECREASING_SIGNIFICANT
    assert "Opposing Regional Trends" in comp_res.comparative_summary
    assert "Amazon Basin" in comp_res.comparative_summary
    assert "Southern Oceans" in comp_res.comparative_summary
    assert "radiative forcing" in comp_res.drivers_explanation
