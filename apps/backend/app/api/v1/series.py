"""Time series API route handlers."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from app.schemas.series import TimeSeriesResponse
from app.schemas.common import ValidationErrorItem
from app.core.exceptions import AppException, NotFoundError
from app.services.series_service import SeriesService
from app.repositories.region_repository import RegionRepository
from app.api.deps import get_series_service, get_region_repository

router = APIRouter(prefix="/series", tags=["Series"])


@router.get("", response_model=TimeSeriesResponse)
async def get_time_series(
    series_service: Annotated[SeriesService, Depends(get_series_service)],
    region_repo: Annotated[RegionRepository, Depends(get_region_repository)],
    variable_id: str = Query(..., description="Canonical variable identifier (e.g. T2M, PRECTOTCORR)"),
    region_id: str | None = Query(None, description="Pre-configured study region identifier"),
    lat: float | None = Query(None, ge=-90.0, le=90.0, description="Geographic latitude (-90 to 90)"),
    lon: float | None = Query(None, ge=-180.0, le=180.0, description="Geographic longitude (-180 to 180)"),
    start_year: int = Query(1990, ge=1981, le=2026, description="Starting calendar year"),
    end_year: int = Query(2025, ge=1981, le=2026, description="Ending calendar year"),
    station_id: str | None = Query(None, description="Optional ground station or marine buoy identifier"),
    offline: bool = Query(False, description="When true, serve strictly from local cache without contacting upstream APIs"),
    location_name: str | None = Query(None, description="Optional custom name or country label for coordinates"),
) -> TimeSeriesResponse:
    """Retrieve normalized historical monthly time series observations."""
    # 1. Temporal bounds validation
    if start_year > end_year:
        raise AppException(
            title="Invalid Temporal Range",
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'start_year' ({start_year}) cannot be greater than 'end_year' ({end_year}).",
            error_type="https://tpbd.nasa.gov/errors/invalid-temporal-range",
            invalid_params=[
                ValidationErrorItem(
                    name="start_year",
                    reason=f"Start year {start_year} exceeds end year {end_year}.",
                )
            ],
        )

    # 2. Spatial resolution: region_id vs explicit lat/lon
    if region_id:
        region = region_repo.get_by_id(region_id)
        if not region:
            raise NotFoundError(resource="Region", identifier=region_id)
        target_lat = region.center_coordinates.latitude
        target_lon = region.center_coordinates.longitude
        resolved_name = region.name
    elif lat is not None and lon is not None:
        target_lat = lat
        target_lon = lon
        resolved_name = location_name if location_name else f"Coordinates ({lat:.2f}, {lon:.2f})"
    else:
        raise AppException(
            title="Missing Geographic Coordinates",
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a valid 'region_id' or both 'lat' and 'lon' coordinates must be provided.",
            error_type="https://tpbd.nasa.gov/errors/missing-coordinates",
            invalid_params=[
                ValidationErrorItem(
                    name="coordinates",
                    reason="Neither 'region_id' nor explicit ('lat', 'lon') were provided.",
                )
            ],
        )

    return await series_service.get_time_series(
        variable_id=variable_id,
        lat=target_lat,
        lon=target_lon,
        start_year=start_year,
        end_year=end_year,
        location_name=resolved_name,
        offline_only=offline,
    )
