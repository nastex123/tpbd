"""Dependency injection providers for FastAPI route handlers."""
from typing import Annotated
from functools import lru_cache
from fastapi import Depends
from app.services.catalog_service import CatalogService
from app.services.series_service import SeriesService
from app.services.trend_service import TrendService
from app.services.anomaly_service import AnomalyService
from app.services.changepoint_service import ChangePointService
from app.services.ai_service import AIService
from app.services.knowledge_service import KnowledgeService
from app.clients.gemini_client import GeminiClient
from app.repositories.region_repository import RegionRepository

from app.repositories.cache_repository import CacheRepository
from app.clients.power_client import PowerClient
from app.clients.appeears_client import AppEEARSClient
from app.clients.projection_client import ProjectionClient
from app.services.projection_service import ProjectionService
from app.core.config import settings


@lru_cache
def get_appeears_client() -> AppEEARSClient:
    """Singleton instance of NASA AppEEARS client adapter with auto-auth."""
    return AppEEARSClient(
        timeout=15.0,
        token=settings.EARTHDATA_TOKEN,
        username=settings.EARTHDATA_USERNAME,
        auto_auth=True,
    )


@lru_cache
def get_catalog_service() -> CatalogService:
    """Singleton instance of CatalogService."""
    return CatalogService()


@lru_cache
def get_trend_service(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
) -> TrendService:
    """Singleton instance of TrendService."""
    cs = catalog_service or get_catalog_service()
    return TrendService(cs)


@lru_cache
def get_anomaly_service() -> AnomalyService:
    """Singleton instance of AnomalyService."""
    return AnomalyService()


@lru_cache
def get_changepoint_service(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)] = None,
) -> ChangePointService:
    """Singleton instance of ChangePointService."""
    cs = catalog_service or get_catalog_service()
    return ChangePointService(cs)


@lru_cache
def get_region_repository() -> RegionRepository:
    """Singleton instance of RegionRepository."""
    return RegionRepository()


@lru_cache
def get_knowledge_service() -> KnowledgeService:
    """Singleton instance of KnowledgeService."""
    return KnowledgeService()


@lru_cache
def get_gemini_client() -> GeminiClient:
    """Singleton instance of GeminiClient."""
    return GeminiClient(api_key=settings.GEMINI_API_KEY)


@lru_cache
def get_ai_service(
    gemini_client: Annotated[GeminiClient, Depends(get_gemini_client)] = None,
    knowledge_service: Annotated[KnowledgeService, Depends(get_knowledge_service)] = None,
) -> AIService:
    """Singleton instance of AIService with knowledge grounding."""
    gc = gemini_client or get_gemini_client()
    ks = knowledge_service or get_knowledge_service()
    return AIService(gemini_client=gc, knowledge_service=ks)


@lru_cache
def get_cache_repository() -> CacheRepository:
    """Singleton instance of CacheRepository."""
    return CacheRepository()


@lru_cache
def get_power_client() -> PowerClient:
    """Singleton instance of NASA POWER client adapter."""
    return PowerClient(timeout=15.0)


@lru_cache
def get_projection_client() -> ProjectionClient:
    """Singleton NASA POWER climate projection client."""
    return ProjectionClient(timeout=20.0)


def get_projection_service(
    client: Annotated[ProjectionClient, Depends(get_projection_client)],
    catalog: Annotated[CatalogService, Depends(get_catalog_service)],
) -> ProjectionService:
    """Build the projection service with shared data client and curated catalog."""
    return ProjectionService(client=client, catalog=catalog)


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
