"""Master router for API v1."""
from fastapi import APIRouter
from app.api.v1 import catalog, regions, series, analytics, integrations, ai, projections

api_router = APIRouter()
api_router.include_router(catalog.router)
api_router.include_router(regions.router)
api_router.include_router(series.router)
api_router.include_router(analytics.router)
api_router.include_router(integrations.router)
api_router.include_router(ai.router)
api_router.include_router(projections.router)


