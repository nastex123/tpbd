"""Unit tests for non-parametric Pettitt change-point service (HU-26)."""
from app.services.changepoint_service import ChangePointService
from app.schemas.analytics import ChangePointRequest, RegimeShiftType
from app.schemas.series import DataPoint


def test_changepoint_detection_abrupt_step():
    """Verify detection of an abrupt level jump in time series."""
    service = ChangePointService()
    points = []

    # 36 months before shift (mean ~20)
    for i in range(36):
        y = 2000 + i // 12
        m = (i % 12) + 1
        val = 20.0 + (0.5 if i % 2 == 0 else -0.5)
        points.append(DataPoint(date=f"{y}-{m:02d}", value=val, quality="observed"))

    # 36 months after shift (mean ~28, abrupt jump)
    for i in range(36, 72):
        y = 2000 + i // 12
        m = (i % 12) + 1
        val = 28.0 + (0.5 if i % 2 == 0 else -0.5)
        points.append(DataPoint(date=f"{y}-{m:02d}", value=val, quality="observed"))

    req = ChangePointRequest(variable_id="T2M", points=points, alpha=0.05)
    res = service.detect_changepoints(req)

    assert res.variable_id == "T2M"
    assert res.has_significant_break is True
    assert res.p_value < 0.001
    assert 34 <= res.change_point_index <= 36
    assert res.change_point_date is not None
    assert res.statistic_k is not None and res.statistic_k > 500


def test_changepoint_detection_accelerating_trend():
    """Verify classification of accelerating increase regime shift."""
    service = ChangePointService()
    points = []

    # Segment 1: Mild increase (slope ~0.02/month)
    for i in range(30):
        y = 1995 + i // 12
        m = (i % 12) + 1
        val = 15.0 + (i * 0.02)
        points.append(DataPoint(date=f"{y}-{m:02d}", value=val, quality="observed"))

    # Segment 2: Dramatic acceleration (slope ~0.20/month)
    base_val = 15.0 + (29 * 0.02)
    for i in range(30, 60):
        y = 1995 + i // 12
        m = (i % 12) + 1
        val = base_val + ((i - 29) * 0.20)
        points.append(DataPoint(date=f"{y}-{m:02d}", value=val, quality="observed"))

    req = ChangePointRequest(variable_id="T2M", points=points, alpha=0.05)
    res = service.detect_changepoints(req)

    assert res.has_significant_break is True
    assert res.regime_shift_type == RegimeShiftType.ACCELERATING_INCREASE
    assert res.post_break_slope is not None
    assert res.pre_break_slope is not None
    assert res.post_break_slope > res.pre_break_slope


def test_changepoint_detection_insufficient_samples():
    """Verify series shorter than 24 months returns NOT_EVALUABLE."""
    service = ChangePointService()
    points = [DataPoint(date=f"2020-{m:02d}", value=20.0 + m, quality="observed") for m in range(1, 13)]

    req = ChangePointRequest(variable_id="T2M", points=points)
    res = service.detect_changepoints(req)

    assert res.has_significant_break is False
    assert res.regime_shift_type == RegimeShiftType.NOT_EVALUABLE
    assert "Insufficient" in res.scientific_notes


def test_changepoint_detection_zero_variance():
    """Verify flat series returns NOT_EVALUABLE without numerical failure."""
    service = ChangePointService()
    points = [DataPoint(date=f"{2000 + i//12}-{(i%12)+1:02d}", value=25.0, quality="observed") for i in range(36)]

    req = ChangePointRequest(variable_id="T2M", points=points)
    res = service.detect_changepoints(req)

    assert res.has_significant_break is False
    assert res.regime_shift_type == RegimeShiftType.NOT_EVALUABLE
    assert "zero variance" in res.scientific_notes.lower()


def test_changepoint_detection_stationary_no_break():
    """Verify stationary series returns NO_SIGNIFICANT_BREAK."""
    service = ChangePointService()
    # 48 months of stationary noise around 20
    points = []
    for i in range(48):
        y = 2000 + i // 12
        m = (i % 12) + 1
        noise = 0.5 if i % 2 == 0 else -0.5
        points.append(DataPoint(date=f"{y}-{m:02d}", value=20.0 + noise, quality="observed"))

    req = ChangePointRequest(variable_id="T2M", points=points, alpha=0.01)
    res = service.detect_changepoints(req)

    assert res.has_significant_break is False
    assert res.regime_shift_type == RegimeShiftType.NO_SIGNIFICANT_BREAK
    assert res.pre_break_slope is None
