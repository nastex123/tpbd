"""AI Copilot and Gemini model routing endpoints (HU-27)."""
from typing import Annotated
from fastapi import APIRouter, Depends, status
from app.schemas.ai import (
    ModelListResponse,
    DetectiveQueryRequest,
    DetectiveQueryResponse,
)
from app.services.ai_service import AIService
from app.api.deps import get_ai_service

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get(
    "/models",
    response_model=ModelListResponse,
    status_code=status.HTTP_200_OK,
    summary="List available Gemini AI models and capabilities",
    description="Returns the full catalog of Gemini models supported by the smart router, including capability tags and recommended scenarios.",
)
async def list_models(
    ai_service: Annotated[AIService, Depends(get_ai_service)],
) -> ModelListResponse:
    """Retrieve supported Gemini model roster."""
    return ai_service.list_models()


@router.post(
    "/investigate",
    response_model=DetectiveQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Natural language scientific investigation copilot",
    description="Analyzes natural language questions and recommends relevant NASA variables, coordinates, and scientific hypotheses.",
)
async def investigate_with_ai(
    request: DetectiveQueryRequest,
    ai_service: Annotated[AIService, Depends(get_ai_service)],
) -> DetectiveQueryResponse:
    """Map natural language questions to NASA variables, regions, and hypotheses."""
    return await ai_service.investigate(request)
