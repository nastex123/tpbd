"""Pre-configured study regions endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends
from app.schemas.regions import Region
from app.repositories.region_repository import RegionRepository
from app.api.deps import get_region_repository

router = APIRouter(prefix="/regions", tags=["Geography"])


@router.get("", response_model=list[Region])
async def list_regions(
    repository: Annotated[RegionRepository, Depends(get_region_repository)],
) -> list[Region]:
    """List curated baseline regions for the 3D globe and investigation presets."""
    return repository.list_all()
