"""Common schemas and RFC 7807 problem details."""
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    """Geographic coordinates in WGS84."""

    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)")


class ValidationErrorItem(BaseModel):
    """Item detail for invalid parameter validation errors."""

    name: str = Field(..., description="Parameter name or path that failed validation")
    reason: str = Field(..., description="Human-readable reason for the failure")


class ProblemDetails(BaseModel):
    """RFC 7807 Problem Details envelope for all HTTP error responses."""

    type: str = Field(default="about:blank", description="URI identifying the problem type")
    title: str = Field(..., description="Short, human-readable summary of the problem type")
    status: int = Field(..., description="HTTP status code")
    detail: str = Field(..., description="Human-readable explanation specific to this occurrence")
    instance: str | None = Field(default=None, description="URI reference identifying the specific occurrence")
    invalid_params: list[ValidationErrorItem] | None = Field(
        default=None, description="List of specific parameter validation failures"
    )
