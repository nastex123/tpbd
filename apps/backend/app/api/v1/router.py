"""Master router for API v1."""
from fastapi import APIRouter
from app.api.v1 import catalog, regions, series

api_router = APIRouter()
api_router.include_router(catalog.router)
api_router.include_router(regions.router)
api_router.include_router(series.router)
