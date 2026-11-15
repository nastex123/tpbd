"""NASA POWER CMIP6 projection endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_projection_service
from app.services.projection_service import ProjectionService
from app.schemas.projections import (
    ProjectionModelsResponse,
    ProjectionScenariosResponse,
    ProjectionSeriesResponse,
    SSPScenario,
)
from app.core.exceptions import AppException

router = APIRouter(prefix="/projections", tags=["Projections"])


@router.get("/scenarios", response_model=ProjectionScenariosResponse)
def list_projection_scenarios(
    service: Annotated[ProjectionService, Depends(get_projection_service)],
) -> ProjectionScenariosResponse:
    """List SSP pathways supported by NASA POWER Projection API."""
    return service.list_scenarios()


@router.get("/models", response_model=ProjectionModelsResponse)
async def list_projection_models(
    service: Annotated[ProjectionService, Depends(get_projection_service)],
) -> ProjectionModelsResponse:
    """List models currently available in NASA POWER's monthly archive."""
    return await service.list_models()


@router.get("/series", response_model=ProjectionSeriesResponse)
async def get_projection_series(
    service: Annotated[ProjectionService, Depends(get_projection_service)],
    variable_id: str = Query(..., min_length=2, max_length=32, pattern=r"^[A-Za-z0-9_]+$"),
    latitude: float = Query(..., ge=-59.875, le=89.875, description="Latitude supported by NASA POWER CMIP6 grid"),
    longitude: float = Query(..., ge=-179.875, le=179.875, description="Longitude supported by NASA POWER CMIP6 grid"),
    start_year: int = Query(2015, ge=2015, le=2100),
    end_year: int = Query(2100, ge=2015, le=2100),
    scenario: SSPScenario = Query(...),
    model: str = Query("ensemble", min_length=1, max_length=40, pattern=r"^[a-z0-9_]+$"),
) -> ProjectionSeriesResponse:
    """Fetch a monthly scenario series, keeping projections separate from observations."""
    if start_year > end_year:
        raise AppException(
            title="Invalid Projection Period", status_code=400,
            detail="start_year cannot be later than end_year.",
            error_type="https://tpbd.nasa.gov/errors/invalid-projection-period",
        )
    return await service.get_monthly_series(
        variable_id=variable_id.upper(),
        latitude=latitude,
        longitude=longitude,
        start_year=start_year,
        end_year=end_year,
        scenario=scenario,
        model=model,
    )
