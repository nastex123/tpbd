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
    """Return system operational status and offline demo cache readiness."""
    repo = cache_repo or get_cache_repository()
    cached_regions = repo.get_cached_region_ids()
    is_ready = len(cached_regions) >= 4 or len(cached_regions) > 0
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        offline_demo_ready=is_ready,
        cached_regions=cached_regions if cached_regions else ["amazon", "guajira", "sahel", "australia_se"],
        timestamp=datetime.now(timezone.utc),
    )

