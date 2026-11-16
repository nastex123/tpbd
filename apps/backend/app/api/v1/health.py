"""Health check endpoint matching OpenAPI contract."""
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends
from app.schemas.health import HealthResponse
from app.core.config import settings
from app.repositories.cache_repository import CacheRepository
from app.api.deps import get_cache_repository

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health(
    cache_repo: Annotated[CacheRepository, Depends(get_cache_repository)] = None,
) -> HealthResponse:
    """Return system status and the regions actually present in the local cache."""
    repo = cache_repo or get_cache_repository()
    cached_regions = repo.get_cached_region_ids()
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        offline_demo_ready=bool(cached_regions),
        cached_regions=cached_regions,
        timestamp=datetime.now(timezone.utc),
    )

