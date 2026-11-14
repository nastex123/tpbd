"""Analytics endpoints for time series trend analysis and regional comparisons."""
from typing import Annotated
from fastapi import APIRouter, Depends, status
from app.schemas.analytics import (
    TrendAnalysisRequest,
    TrendAnalysisResponse,
    RegionalComparisonRequest,
    RegionalComparisonResponse,
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
)
from app.services.trend_service import TrendService
from app.services.anomaly_service import AnomalyService
from app.api.deps import get_trend_service, get_anomaly_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post(
    "/trends",
    response_model=TrendAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform Seasonal Mann-Kendall trend analysis",
    description="Calculates robust non-parametric trend direction, Sen's slope (units/decade), 95% CI, and autocorrelation diagnostics.",
)
async def analyze_trend(
    request: TrendAnalysisRequest,
    trend_service: Annotated[TrendService, Depends(get_trend_service)],
) -> TrendAnalysisResponse:
    """Analyze historical trend for a single time series."""
    return trend_service.analyze_trend(request)


@router.post(
    "/compare",
    response_model=RegionalComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare trends across two geographical regions",
    description="Compares trend direction and rate of change between two regions for the same variable.",
)
async def compare_regional_trends(
    request: RegionalComparisonRequest,
    trend_service: Annotated[TrendService, Depends(get_trend_service)],
) -> RegionalComparisonResponse:
    """Compare trends between two locations."""
    return trend_service.compare_regional_trends(request)


@router.post(
    "/anomalies",
    response_model=AnomalyDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect seasonal standardized Z-score anomalies",
    description="Calculates standardized monthly climatological anomalies relative to reference baseline (default 1991–2020).",
)
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    anomaly_service: Annotated[AnomalyService, Depends(get_anomaly_service)],
) -> AnomalyDetectionResponse:
    """Compute monthly climatology and identify extreme statistical deviations."""
    return anomaly_service.detect_anomalies(request)
