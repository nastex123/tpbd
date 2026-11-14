"""Pydantic schemas package."""
from app.schemas.common import Coordinates, ProblemDetails, ValidationErrorItem
from app.schemas.health import HealthResponse
from app.schemas.catalog import Variable, VariableCategory, DataSourceProvider, SatelliteProduct
from app.schemas.regions import Region
from app.schemas.series import DataPoint, TimeSeriesResponse
from app.schemas.analytics import (
    TrendDirection,
    TrendAnalysisRequest,
    TrendAnalysisResponse,
    AutocorrelationDiagnostic,
    RegionalComparisonRequest,
    RegionalComparisonResponse,
)
from app.schemas.integrations import (
    AppEEARSTaskRequest,
    AppEEARSTaskResponse,
    AppEEARSTaskStatus,
    AppEEARSLoginRequest,
    AppEEARSLoginResponse,
    AppEEARSAuthStatus,
)

__all__ = [
    "Coordinates",
    "ProblemDetails",
    "ValidationErrorItem",
    "HealthResponse",
    "Variable",
    "VariableCategory",
    "DataSourceProvider",
    "SatelliteProduct",
    "Region",
    "DataPoint",
    "TimeSeriesResponse",
    "TrendDirection",
    "TrendAnalysisRequest",
    "TrendAnalysisResponse",
    "AutocorrelationDiagnostic",
    "RegionalComparisonRequest",
    "RegionalComparisonResponse",
    "AppEEARSTaskRequest",
    "AppEEARSTaskResponse",
    "AppEEARSTaskStatus",
    "AppEEARSLoginRequest",
    "AppEEARSLoginResponse",
    "AppEEARSAuthStatus",
]
