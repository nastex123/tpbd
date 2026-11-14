"""Statistical analytics schemas for trend detection and regional comparisons."""
from enum import Enum
from pydantic import BaseModel, Field
from app.schemas.series import DataPoint


class TrendDirection(str, Enum):
    """Categorical classification of time series trend."""

    INCREASING_SIGNIFICANT = "increasing_significant"
    DECREASING_SIGNIFICANT = "decreasing_significant"
    NO_SIGNIFICANT_TREND = "no_significant_trend"
    NOT_EVALUABLE = "not_evaluable"


class AutocorrelationDiagnostic(BaseModel):
    """Diagnostic details for lag-1 serial autocorrelation."""

    lag1_autocorrelation: float = Field(..., description="Estimated lag-1 autocorrelation coefficient (r1)")
    is_autocorrelated: bool = Field(..., description="True if serial dependency is statistically significant")
    correction_applied: str | None = Field(default=None, description="Variance correction method used (e.g. Hamed-Rao)")


class TrendAnalysisRequest(BaseModel):
    """Payload for executing statistical trend analysis."""

    variable_id: str = Field(..., description="Canonical variable identifier")
    alpha: float = Field(default=0.05, ge=0.001, le=0.20, description="Significance threshold (alpha)")
    method: str = Field(default="seasonal_mann_kendall", description="Statistical test method")
    points: list[DataPoint] = Field(
        ..., max_length=2400, description="Historical data points to analyze (max 200 years of monthly data)"
    )


class TrendAnalysisResponse(BaseModel):
    """Complete results of Seasonal Mann-Kendall and Sen's slope calculation."""

    variable_id: str = Field(..., description="Canonical variable identifier")
    direction: TrendDirection = Field(..., description="Classified trend direction")
    method: str = Field(..., description="Statistical method applied")
    rate_per_decade: float | None = Field(default=None, description="Sen's slope expressed in units per decade")
    rate_unit: str = Field(..., description="Rate of change unit (e.g. °C/decade)")
    confidence_interval_95: list[float] | None = Field(
        default=None, description="Lower and upper bounds of 95% confidence interval for rate_per_decade"
    )
    p_value: float | None = Field(default=None, description="Calculated two-tailed p-value")
    z_statistic: float | None = Field(default=None, description="Standardized Z test statistic")
    alpha: float = Field(default=0.05, description="Significance threshold applied")
    sample_count: int = Field(..., description="Total observation count")
    valid_count: int = Field(..., description="Valid non-null observation count")
    autocorrelation: AutocorrelationDiagnostic | None = Field(default=None, description="Autocorrelation metrics")
    plain_language_verdict: str = Field(..., description="Clear explanation for students and general public")
    scientific_caveat: str = Field(..., description="Statement explaining method limits and lack of causal proof")


class RegionalLocationPoints(BaseModel):
    """Region payload for comparative trend analysis."""

    location_name: str = Field(..., description="Region title")
    points: list[DataPoint] = Field(
        ..., max_length=2400, description="Ordered observations (max 200 years of monthly data)"
    )


class RegionalComparisonRequest(BaseModel):
    """Request payload comparing trends between two distinct regions."""

    variable_id: str = Field(..., description="Common variable identifier")
    region_a: RegionalLocationPoints = Field(..., description="First location data")
    region_b: RegionalLocationPoints = Field(..., description="Second location data")


class RegionalComparisonResponse(BaseModel):
    """Comparative trend outcome contrasting two geographical locations."""

    variable_id: str = Field(..., description="Common variable analyzed")
    are_comparable: bool = Field(..., description="True if periods, units, and resolutions are comparable")
    trend_region_a: TrendAnalysisResponse = Field(..., description="Trend outcome for region A")
    trend_region_b: TrendAnalysisResponse = Field(..., description="Trend outcome for region B")
    comparative_summary: str = Field(..., description="High-level narrative of differences or opposing trends")
    drivers_explanation: str = Field(..., description="Scientific context explaining potential shared mechanisms")
