"""FastAPI application entrypoint for TPBD Climate Engine."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.exceptions import register_exception_handlers
from app.core.rate_limit import AIRateLimitMiddleware
from app.api.v1.health import router as health_router
from app.api.v1.router import api_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events (startup & shutdown)."""
    setup_logging()
    logger.info("Initializing %s v%s...", settings.PROJECT_NAME, settings.VERSION)

    # Auto-seed SQLite cache with curated benchmark regions for offline demo (HU-14)
    try:
        from app.api.deps import get_cache_repository, get_series_service, get_catalog_service, get_power_client, get_region_repository
        from app.services.seeder_service import SeederService
        cache_repo = get_cache_repository()
        catalog_svc = get_catalog_service()
        power_cl = get_power_client()
        region_repo = get_region_repository()
        series_service = get_series_service(
            power_client=power_cl,
            cache_repo=cache_repo,
            catalog_service=catalog_svc,
            region_repo=region_repo,
        )
        seeder = SeederService(cache_repo, series_service, catalog_svc)
        seeded = seeder.seed_all_curated_regions()
        logger.info("Offline demo cache ready with %d benchmark regions: %s", len(seeded), seeded)
    except Exception as exc:
        logger.warning("Could not auto-seed cache on startup: %s", exc)

    # Auto-authenticate AppEEARS client if EARTHDATA credentials/token are present
    try:
        from app.api.deps import get_appeears_client
        appeears_client = get_appeears_client()
        if not appeears_client.is_authenticated():
            await appeears_client.auto_authenticate(
                username=settings.EARTHDATA_USERNAME,
                password=settings.EARTHDATA_PASSWORD,
                token=settings.EARTHDATA_TOKEN,
            )
        if appeears_client.is_authenticated():
            logger.info("AppEEARS client session ready (authenticated: True)")
    except Exception as exc:
        logger.warning("Could not auto-authenticate AppEEARS on startup: %s", exc)

    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)



def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="Local analytical engine for TPBD — The Pale Blue Dot (NASA Space Apps Challenge 2026).",
        lifespan=lifespan,
    )

    # CORS configuration for Vite / Electron desktop client
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register RFC 7807 problem details exception handlers
    register_exception_handlers(app)

    # In-memory rate limiting defense-in-depth for Gemini AI Copilot routes
    app.add_middleware(AIRateLimitMiddleware)

    # Root health check (required by Brandon's Electron diagnostic proxy /api/local/health)
    app.include_router(health_router)

    # Versioned API routes (/api/v1/*)
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
