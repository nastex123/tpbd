"""AI Copilot and Gemini model routing endpoints (HU-27)."""
from typing import Annotated
from fastapi import APIRouter, Depends, status
from app.schemas.ai import (
    ModelListResponse,
    DetectiveQueryRequest,
    DetectiveQueryResponse,
    TrendExplanationRequest,
    TrendExplanationResponse,
    AudioBriefRequest,
    AudioBriefResponse,
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


@router.post(
    "/explain-trend",
    response_model=TrendExplanationResponse,
    status_code=status.HTTP_200_OK,
    summary="Deep scientific trend synthesis and physical driver explanation",
    description="Connects computed Mann-Kendall statistics, Sen's slope rates, and Pettitt structural breaks to planetary atmospheric and oceanic processes using Gemini extended thinking models.",
)
async def explain_trend(
    request: TrendExplanationRequest,
    ai_service: Annotated[AIService, Depends(get_ai_service)],
) -> TrendExplanationResponse:
    """Synthesize statistical findings into publication-grade scientific narrative."""
    return await ai_service.explain_trend(request)


@router.post(
    "/audio-brief",
    response_model=AudioBriefResponse,
    status_code=status.HTTP_200_OK,
    summary="NASA Mission Control spoken audio debrief (TTS)",
    description="Generates spoken speech audio (Base64-encoded WAV) for instant desktop audio playback via Gemini Flash TTS.",
)
async def generate_audio_brief(
    request: AudioBriefRequest,
    ai_service: Annotated[AIService, Depends(get_ai_service)],
) -> AudioBriefResponse:
    """Generate audio speech debrief for Earth system findings."""
    return await ai_service.generate_audio_brief(request)
