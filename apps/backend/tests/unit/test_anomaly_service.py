"""Unit tests for seasonal climatology Z-score anomaly service (HU-10)."""
from app.services.anomaly_service import AnomalyService
from app.schemas.analytics import AnomalyDetectionRequest, AnomalySeverity
from app.schemas.series import DataPoint


def test_anomaly_detection_climatology_and_extremes():
    """Verify climatology calculation and extreme anomaly detection."""
    service = AnomalyService()

    # Generate 30 years (1991-2020) with predictable seasonality and variance
    points = []
    for y in range(1991, 2021):
        for m in range(1, 13):
            # Base seasonality + interannual variability
            noise = 0.5 if y % 2 == 0 else -0.5
            val = 20.0 + (m * 1.0) + noise
            if m == 7:
                val = 30.0 + (1.0 if y % 2 == 0 else -1.0)
            points.append(DataPoint(date=f"{y}-{m:02d}", value=val, quality="observed"))

    # Add a year with a massive heatwave anomaly in 2023-07 (value 35.0 -> +5 std devs)
    points.append(DataPoint(date="2023-07", value=35.0, quality="observed"))
    # Add a normal point in 2023-01
    points.append(DataPoint(date="2023-01", value=21.0, quality="observed"))
    # Add a missing point in 2023-02
    points.append(DataPoint(date="2023-02", value=None, quality="missing"))

    req = AnomalyDetectionRequest(variable_id="T2M", points=points, threshold=2.0)
    res = service.detect_anomalies(req)

    assert res.variable_id == "T2M"
    assert len(res.monthly_climatology) == 12
    july_clim = next(c for c in res.monthly_climatology if c.month == 7)
    assert july_clim.baseline_mean == 30.0
    assert 0.9 <= july_clim.baseline_std <= 1.1

    # Check anomalies
    anomaly_july = next(a for a in res.anomalies if a.date == "2023-07")
    assert anomaly_july.severity == AnomalySeverity.EXTREME_ANOMALY
    assert anomaly_july.anomaly_z > 4.0

    anomaly_jan = next(a for a in res.anomalies if a.date == "2023-01")
    assert anomaly_jan.severity == AnomalySeverity.NORMAL

    anomaly_feb = next(a for a in res.anomalies if a.date == "2023-02")
    assert anomaly_feb.severity == AnomalySeverity.NOT_EVALUABLE

    assert res.severe_anomaly_count >= 1


def test_anomaly_detection_zero_variance_not_evaluable():
    """Verify zero variance in baseline returns NOT_EVALUABLE without errors."""
    service = AnomalyService()
    # All identical values
    points = [DataPoint(date=f"{y}-05", value=25.0, quality="observed") for y in range(1991, 2021)]
    points.append(DataPoint(date="2023-05", value=26.0, quality="observed"))

    req = AnomalyDetectionRequest(variable_id="T2M", points=points)
    res = service.detect_anomalies(req)

    target_anomaly = next(a for a in res.anomalies if a.date == "2023-05")
    assert target_anomaly.severity == AnomalySeverity.NOT_EVALUABLE
    assert target_anomaly.anomaly_z is None
