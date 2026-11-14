"""Dependency injection providers for FastAPI route handlers."""
from typing import Annotated
from functools import lru_cache
from fastapi import Depends
from app.services.catalog_service import CatalogService
from app.services.series_service import SeriesService
from app.repositories.region_repository import RegionRepository
from app.repositories.cache_repository import CacheRepository
from app.clients.power_client import PowerClient


@lru_cache
def get_catalog_service() -> CatalogService:
    """Singleton instance of CatalogService."""
    return CatalogService()


@lru_cache
def get_region_repository() -> RegionRepository:
    """Singleton instance of RegionRepository."""
    return RegionRepository()


@lru_cache
def get_cache_repository() -> CacheRepository:
    """Singleton instance of CacheRepository."""
    return CacheRepository()


@lru_cache
def get_power_client() -> PowerClient:
    """Singleton instance of NASA POWER client adapter."""
    return PowerClient(timeout=15.0)


def get_series_service(
    power_client: Annotated[PowerClient, Depends(get_power_client)],
    cache_repo: Annotated[CacheRepository, Depends(get_cache_repository)],
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    region_repo: Annotated[RegionRepository, Depends(get_region_repository)],
) -> SeriesService:
    """Factory for SeriesService with injected dependencies."""
    return SeriesService(
        power_client=power_client,
        cache_repo=cache_repo,
        catalog_service=catalog_service,
        region_repo=region_repo,
    )
