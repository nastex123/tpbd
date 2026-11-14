"""FastAPI application entrypoint for TPBD Climate Engine."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.api.v1.health import router as health_router
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events (startup & shutdown)."""
    # Startup: ensure cache directories exist, log operational parameters
    yield
    # Shutdown: clean up any active connection pools


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

    # Root health check (required by Brandon's Electron diagnostic proxy /api/local/health)
    app.include_router(health_router)

    # Versioned API routes (/api/v1/*)
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
