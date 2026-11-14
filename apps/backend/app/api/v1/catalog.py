"""Catalog endpoints for variable and satellite product discovery."""
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from app.schemas.catalog import Variable, VariableCategory, DataSourceProvider, SatelliteProduct
from app.services.catalog_service import CatalogService
from app.api.deps import get_catalog_service
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get("/variables", response_model=list[Variable])
async def list_variables(
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    category: VariableCategory | None = Query(None, description="Filter variables by Earth system category"),
    provider: DataSourceProvider | None = Query(None, description="Filter by primary upstream data provider"),
) -> list[Variable]:
    """List all curated Earth science variables available for trend investigation."""
    return service.list_variables(category=category, provider=provider)


@router.get("/variables/{variable_id}", response_model=Variable)
async def get_variable(
    variable_id: str,
    service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> Variable:
    """Get variable metadata, units, data community, and physical definition."""
    variable = service.get_variable_by_id(variable_id)
    if not variable:
        raise NotFoundError(resource="Variable", identifier=variable_id)
    return variable


@router.get("/products", response_model=list[SatelliteProduct])
async def list_products(
    service: Annotated[CatalogService, Depends(get_catalog_service)],
    platform: str | None = Query(None, description="Filter by satellite platform (e.g. MODIS, SMAP)"),
) -> list[SatelliteProduct]:
    """List satellite missions and products accessible through NASA AppEEARS."""
    return service.list_products(platform=platform)
