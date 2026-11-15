"""Skill: Contract Validator.
Deep validation of JSON payloads for frontend safety and satellite data hygiene:
- Prohibits NaN, Infinity, -9999 fill values as valid numbers.
- Validates date formats (YYYY-MM, ISO-8601).
- Validates geographic coordinates (lat in [-90, 90], lon in [-180, 180]).
- Validates RFC 7807 problem details for errors.
- Validates frontend chart safety (Recharts points array, quality indicators).
"""
import math
import re
from typing import Any

MONTHLY_DATE_REGEX = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
ISO8601_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$")

SATELLITE_FILL_VALUES = {-9999, -9999.0, -999.0, -999, -32768, -32767}


class ContractValidationResult:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, message: str) -> None:
        self.errors.append(message)

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def to_dict(self) -> dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
        }


def validate_no_corrupt_numbers(data: Any, path: str = "root", result: ContractValidationResult | None = None) -> ContractValidationResult:
    """Recursively check that no NaN, Infinity, or unhandled -9999 fill values exist in numeric fields."""
    if result is None:
        result = ContractValidationResult()

    if isinstance(data, float):
        if math.isnan(data):
            result.add_error(f"NaN value detected at {path}")
        elif math.isinf(data):
            result.add_error(f"Infinity value detected at {path}")
        elif data in SATELLITE_FILL_VALUES:
            result.add_error(f"Raw satellite fill value {data} detected at {path} instead of null")

    elif isinstance(data, int):
        if data in SATELLITE_FILL_VALUES:
            result.add_error(f"Raw satellite fill value {data} detected at {path} instead of null")

    elif isinstance(data, dict):
        for k, v in data.items():
            validate_no_corrupt_numbers(v, f"{path}.{k}", result)

    elif isinstance(data, list):
        for idx, item in enumerate(data):
            validate_no_corrupt_numbers(item, f"{path}[{idx}]", result)

    return result


def validate_coordinates(lat: Any, lon: Any, context: str = "coordinates") -> list[str]:
    """Validate that coordinates are within lawful physical ranges."""
    errors = []
    if not isinstance(lat, (int, float)):
        errors.append(f"{context}.latitude must be numeric, got {type(lat).__name__}")
    elif not (-90.0 <= lat <= 90.0):
        errors.append(f"{context}.latitude {lat} out of range [-90, 90]")

    if not isinstance(lon, (int, float)):
        errors.append(f"{context}.longitude must be numeric, got {type(lon).__name__}")
    elif not (-180.0 <= lon <= 180.0):
        errors.append(f"{context}.longitude {lon} out of range [-180, 180]")

    return errors


def validate_series_payload(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate TimeSeriesResponse structure for frontend Recharts compatibility."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "series", result)

    required_keys = ["variable_id", "unit", "temporal_range", "points", "sample_count", "valid_count", "missing_count"]
    for key in required_keys:
        if key not in payload:
            result.add_error(f"Missing required field '{key}' in TimeSeriesResponse")

    points = payload.get("points")
    if not isinstance(points, list):
        result.add_error("TimeSeriesResponse.points must be a list")
        return result

    for idx, pt in enumerate(points):
        if not isinstance(pt, dict):
            result.add_error(f"Point [{idx}] must be a dict")
            continue

        date_val = pt.get("date")
        if not date_val or not isinstance(date_val, str) or not MONTHLY_DATE_REGEX.match(date_val):
            result.add_error(f"Point [{idx}] has invalid date format: '{date_val}' (expected YYYY-MM)")

        quality = pt.get("quality")
        if quality not in ("observed", "missing", "projected"):
            result.add_error(f"Point [{idx}] has invalid quality '{quality}'")

        val = pt.get("value")
        if quality == "missing" and val is not None:
            result.add_error(f"Point [{idx}] with quality 'missing' must have value null, got {val}")
        elif quality == "observed" and val is None:
            result.add_warning(f"Point [{idx}] with quality 'observed' has value null")

    coords = payload.get("query_coordinates")
    if isinstance(coords, dict):
        lat = coords.get("latitude")
        lon = coords.get("longitude")
        for err in validate_coordinates(lat, lon, "query_coordinates"):
            result.add_error(err)

    return result


def validate_rfc7807_error(payload: dict[str, Any], expected_status: int | None = None) -> ContractValidationResult:
    """Validate RFC 7807 Problem Details error payload."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "error", result)

    for field in ("type", "title", "status", "detail"):
        if field not in payload:
            result.add_error(f"RFC 7807 error missing required field: '{field}'")

    if expected_status is not None:
        status = payload.get("status")
        if status != expected_status:
            result.add_error(f"RFC 7807 error status {status} does not match HTTP status {expected_status}")

    return result


def validate_analytics_trend(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate TrendAnalysisResponse structure."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "trend", result)

    valid_directions = {
        "increasing_significant",
        "decreasing_significant",
        "no_significant_trend",
        "not_evaluable",
    }
    direction = payload.get("direction")
    if direction not in valid_directions:
        result.add_error(f"Invalid direction '{direction}' (must be one of {valid_directions})")

    p_value = payload.get("p_value")
    if p_value is not None:
        if not isinstance(p_value, (int, float)) or not (0.0 <= p_value <= 1.0):
            result.add_error(f"p_value {p_value} must be a float between 0.0 and 1.0")

    required = ["variable_id", "direction", "method", "rate_unit", "plain_language_verdict", "scientific_caveat"]
    for req in required:
        if req not in payload:
            result.add_error(f"Missing required field '{req}' in TrendAnalysisResponse")

    return result


def validate_regional_comparison(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate RegionalComparisonResponse structure."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "comparison", result)

    required = ["variable_id", "are_comparable", "trend_region_a", "trend_region_b", "comparative_summary", "drivers_explanation"]
    for req in required:
        if req not in payload:
            result.add_error(f"Missing required field '{req}' in RegionalComparisonResponse")

    return result


def validate_anomaly_detection(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate AnomalyDetectionResponse structure."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "anomalies", result)

    required = ["variable_id", "baseline_range", "monthly_climatology", "anomalies", "severe_anomaly_count", "method"]
    for req in required:
        if req not in payload:
            result.add_error(f"Missing required field '{req}' in AnomalyDetectionResponse")

    return result


def validate_changepoint(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate ChangePointResponse structure."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "changepoints", result)

    required = ["variable_id", "has_significant_break", "regime_shift_type", "unit_per_decade", "method", "scientific_notes"]
    for req in required:
        if req not in payload:
            result.add_error(f"Missing required field '{req}' in ChangePointResponse")

    return result


def validate_projections_series(payload: dict[str, Any]) -> ContractValidationResult:
    """Validate ProjectionSeriesResponse structure according to docs/openapi.yaml."""
    result = ContractValidationResult()
    validate_no_corrupt_numbers(payload, "projections_series", result)

    required = [
        "variable_id",
        "scenario",
        "model",
        "unit",
        "temporal_resolution",
        "spatial_resolution",
        "requested_coordinates",
        "grid_coordinates",
        "source",
        "source_url",
        "period",
        "points",
        "is_projection",
        "caveat",
    ]
    for req in required:
        if req not in payload:
            result.add_error(f"Missing required field '{req}' in ProjectionSeriesResponse")

    return result
