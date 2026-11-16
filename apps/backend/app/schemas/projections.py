"""NASA POWER CMIP6 projection API schemas."""
from enum import Enum
from pydantic import BaseModel, Field


class SSPScenario(str, Enum):
    """Supported Shared Socioeconomic Pathways exposed by NASA POWER."""

    SSP126 = "ssp126"
    SSP245 = "ssp245"
    SSP370 = "ssp370"


class ProjectionScenarioInfo(BaseModel):
    scenario: SSPScenario
    name: str
    description: str
    caveat: str = "Conditional model scenario, not an exact prediction."


class ProjectionScenariosResponse(BaseModel):
    scenarios: list[ProjectionScenarioInfo]


class ProjectionModelsResponse(BaseModel):
    temporal: str = "monthly"
    models: list[str]
    source: str = "NASA POWER Projection API"


class ProjectionDataPoint(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    value: float | None = None
    quality: str = "projected"


class ProjectionSeriesResponse(BaseModel):
    variable_id: str
    scenario: SSPScenario
    model: str
    unit: str
    temporal_resolution: str = "monthly"
    spatial_resolution: str = "0.25° x 0.25°"
    requested_coordinates: dict[str, float]
    grid_coordinates: dict[str, float]
    source: str = "NASA POWER Projection API / NEX-GDDP-CMIP6"
    source_url: str = "https://power.larc.nasa.gov/docs/services/api/projection/"
    period: dict[str, str]
    points: list[ProjectionDataPoint]
    uncertainty: float | None = None
    uncertainty_note: str = "The monthly point response does not provide an uncertainty interval; model and scenario are retained for interpretation."
    is_projection: bool = True
    caveat: str = "Conditional climate-model scenario, not an exact prediction or observation."


class ProjectionSeriesRequest(BaseModel):
    """Payload for POST /api/v1/projections/series."""

    variable_id: str = Field(..., min_length=2, max_length=32, pattern=r"^[A-Za-z0-9_]+$")
    lat: float | None = Field(None, ge=-59.875, le=89.875)
    lon: float | None = Field(None, ge=-179.875, le=179.875)
    latitude: float | None = Field(None, ge=-59.875, le=89.875)
    longitude: float | None = Field(None, ge=-179.875, le=179.875)
    start_year: int = Field(2015, ge=2015, le=2100)
    end_year: int = Field(2100, ge=2015, le=2100)
    scenario: SSPScenario
    model: str = Field("ensemble", min_length=1, max_length=40, pattern=r"^[a-z0-9_]+$")

