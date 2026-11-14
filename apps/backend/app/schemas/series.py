"""Time series and data point schemas."""
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates
from app.schemas.catalog import DataSourceProvider


class DataPoint(BaseModel):
    """Single monthly temporal observation."""

    date: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Monthly date in YYYY-MM format")
    value: float | None = Field(default=None, description="Observed numeric value; null represents missing data")
    quality: str = Field(default="valid", description="Data quality or origin tag (measured, reanalysis, missing)")


class TimeSeriesResponse(BaseModel):
    """Standard normalized historical Earth science time series."""

    variable_id: str = Field(..., description="Canonical variable identifier")
    unit: str = Field(..., description="Measurement unit")
    provider: DataSourceProvider = Field(..., description="Data provider")
    location_name: str = Field(..., description="Location title or coordinates description")
    query_coordinates: Coordinates = Field(..., description="Requested geographic coordinates")
    representative_grid_cell: str = Field(..., description="Associated grid cell coordinates from the source")
    spatial_resolution: str = Field(..., description="Spatial grid resolution")
    temporal_range: str = Field(..., description="Available or requested date range")
    sample_count: int = Field(..., description="Total monthly slots in the time series")
    valid_count: int = Field(..., description="Count of non-null observations")
    missing_count: int = Field(..., description="Count of missing/null observations")
    is_cached: bool = Field(default=False, description="True if served from local cache")
    points: list[DataPoint] = Field(default_factory=list, description="Ordered chronological data points")
