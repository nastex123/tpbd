"""Integration tests for analytics endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_post_analytics_trends_success(client):
    """Verify POST /api/v1/analytics/trends computes Seasonal Mann-Kendall result successfully."""
    # 5 years of warming monthly data
    points = []
    for y in range(2015, 2020):
        for m in range(1, 13):
            month_idx = (y - 2015) * 12 + (m - 1)
            val = 22.0 + (month_idx * 0.05)
            points.append({"date": f"{y}-{m:02d}", "value": round(val, 2), "quality": "observed"})

    payload = {
        "variable_id": "T2M",
        "alpha": 0.05,
        "method": "seasonal_mann_kendall",
        "points": points,
    }

    res = client.post("/api/v1/analytics/trends", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["variable_id"] == "T2M"
    assert data["direction"] == "increasing_significant"
    assert data["rate_per_decade"] > 0
    assert data["rate_unit"] == "°C/decade"
    assert data["confidence_interval_95"] is not None
    assert data["p_value"] < 0.05
    assert data["sample_count"] == 60
    assert data["valid_count"] == 60
    assert "plain_language_verdict" in data
    assert "scientific_caveat" in data


def test_post_analytics_trends_validation_error(client):
    """Verify invalid alpha outside [0.001, 0.20] returns 400 Bad Request via RFC 7807 handler."""
    payload = {
        "variable_id": "T2M",
        "alpha": 0.95,  # Exceeds maximum 0.20
        "points": [{"date": "2020-01", "value": 25.0}],
    }
    res = client.post("/api/v1/analytics/trends", json=payload)
    assert res.status_code == 400
    assert res.json()["title"] == "Validation Error"


def test_post_analytics_compare_success(client):
    """Verify POST /api/v1/analytics/compare successfully contrasts two regions."""
    points_a = []
    points_b = []
    for y in range(2015, 2020):
        for m in range(1, 13):
            idx = (y - 2015) * 12 + (m - 1)
            points_a.append({"date": f"{y}-{m:02d}", "value": round(100.0 - (idx * 0.5), 1), "quality": "observed"})
            points_b.append({"date": f"{y}-{m:02d}", "value": round(50.0 + (idx * 0.3), 1), "quality": "observed"})

    payload = {
        "variable_id": "PRECTOTCORR",
        "region_a": {
            "location_name": "Amazon Basin",
            "points": points_a,
        },
        "region_b": {
            "location_name": "Sahel Region",
            "points": points_b,
        },
    }

    res = client.post("/api/v1/analytics/compare", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["variable_id"] == "PRECTOTCORR"
    assert data["are_comparable"] is True
    assert data["trend_region_a"]["direction"] == "decreasing_significant"
    assert data["trend_region_b"]["direction"] == "increasing_significant"
    assert "Opposing Regional Trends" in data["comparative_summary"]
    assert "teleconnections" in data["drivers_explanation"].lower() or "itcz" in data["drivers_explanation"].lower()


def test_post_analytics_anomalies_success(client):
    """Verify POST /api/v1/analytics/anomalies endpoint calculates climatology and anomalies."""
    points = []
    for y in range(1991, 2021):
        for m in range(1, 13):
            # Include variance across years so std dev is non-zero
            val = 25.0 + (m * 0.5) + (0.5 if y % 2 == 0 else -0.5)
            points.append({"date": f"{y}-{m:02d}", "value": val, "quality": "observed"})

    # Add an extreme anomaly in 2024 (mean for month 6 is 28.0, std is ~0.5 -> 40.0 is massive z > 20)
    points.append({"date": "2024-06", "value": 40.0, "quality": "observed"})

    payload = {
        "variable_id": "T2M",
        "threshold": 2.0,
        "points": points,
    }

    res = client.post("/api/v1/analytics/anomalies", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["variable_id"] == "T2M"
    assert len(data["monthly_climatology"]) == 12
    assert "Standardized Monthly Climatology" in data["method"]
    assert "scientific_caveat" in data
    assert data["severe_anomaly_count"] >= 1

