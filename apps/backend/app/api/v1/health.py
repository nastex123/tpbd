"""Health check endpoint matching OpenAPI contract."""
from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def get_health() -> HealthResponse:
    """Return system operational status and offline demo cache readiness."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        offline_demo_ready=True,
        cached_regions=["amazon", "guajira", "sahel", "australia_se"],
        timestamp=datetime.now(timezone.utc),
    )
