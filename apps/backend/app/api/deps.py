"""Dependency injection providers for FastAPI route handlers."""
from functools import lru_cache
from app.services.catalog_service import CatalogService
from app.repositories.region_repository import RegionRepository
from app.repositories.cache_repository import CacheRepository


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
