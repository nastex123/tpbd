"""Catalog schemas for variables and satellite products."""
from enum import Enum
from pydantic import BaseModel, Field


class VariableCategory(str, Enum):
    """Categorization of Earth science parameters."""

    ATMOSPHERE = "atmosphere"
    HYDROLOGY = "hydrology"
    LAND_SURFACE = "land_surface"
    VEGETATION = "vegetation"
    OCEAN_AND_MARINE = "ocean_and_marine"


class DataSourceProvider(str, Enum):
    """Supported upstream scientific data providers."""

    NASA_POWER = "NASA_POWER"
    NASA_APPEEARS = "NASA_APPEEARS"
    NOAA_NCEI = "NOAA_NCEI"


class Variable(BaseModel):
    """Curated Earth science variable metadata."""

    variable_id: str = Field(..., description="Canonical variable identifier (e.g. T2M, PRECTOTCORR)")
    display_name: str = Field(..., description="Human-readable variable title")
    unit: str = Field(..., description="Measurement unit (e.g. °C, mm/month, fraction)")
    category: VariableCategory = Field(..., description="Earth system category")
    provider: DataSourceProvider = Field(..., description="Primary upstream provider")
    description: str = Field(..., description="Plain-language definition for students and researchers")
    spatial_resolution: str = Field(..., description="Native spatial grid resolution (e.g. 0.5° x 0.625°)")
    temporal_range: str = Field(..., description="Available historical period (e.g. 1981-01 to 2025-12)")
    source_model_or_sensor: str = Field(..., description="Originating mission or model (e.g. MERRA-2, MODIS Terra)")
    data_community: str | None = Field(default=None, description="NASA POWER community or DAAC product identifier")


class SatelliteProduct(BaseModel):
    """NASA AppEEARS satellite mission product details."""

    product_id: str = Field(..., description="AppEEARS ProductAndVersion ID (e.g. MOD13Q1.061)")
    platform: str = Field(..., description="Satellite platform (e.g. Terra MODIS, SMAP)")
    description: str = Field(..., description="Product summary")
    resolution: str = Field(..., description="Spatial resolution (e.g. 250m, 1000m)")
    temporal_granularity: str = Field(..., description="Temporal step (e.g. 16 day, Daily)")
    available_layers: list[str] = Field(default_factory=list, description="Available layer names for sampling")
