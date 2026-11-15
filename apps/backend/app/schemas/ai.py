"""Schemas for Gemini AI Synthetic Intelligence (SI) and model routing."""
from enum import Enum
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates


class ModelCapability(str, Enum):
    """Functional capabilities supported by Gemini model variants."""

    TEXT = "text"
    THINKING = "thinking"
    TTS = "tts"
    VISION = "vision"
    AUDIO_IN = "audio_in"


class AIModelInfo(BaseModel):
    """Metadata describing an available Gemini model."""

    model_id: str = Field(..., description="Unique model identifier accepted by Gemini API", json_schema_extra={"example": "gemini-3.8-flash"})
    display_name: str = Field(..., description="Human-readable model name", json_schema_extra={"example": "Gemini 3.8 Flash"})
    capabilities: list[ModelCapability] = Field(..., description="Set of supported modality capabilities")
    recommended_use: str = Field(..., description="Recommended scenario or workflow")
    context_window: int = Field(..., description="Nominal token context window limit")


class ModelListResponse(BaseModel):
    """Catalog of available Gemini models."""

    models: list[AIModelInfo] = Field(..., description="List of available models")
    default_model: str = Field(default="gemini-3.8-flash", description="Default model for auto routing")
    active_api_key_configured: bool = Field(..., description="Whether a valid GEMINI_API_KEY is configured")


class DetectiveQueryRequest(BaseModel):
    """Request payload for natural language scientific investigation search."""

    query: str = Field(..., min_length=3, max_length=500, description="Natural language question or investigation topic", json_schema_extra={"example": "Where is drought worsening in South America?"})
    model: str = Field(default="auto", description="Target Gemini model identifier or 'auto' for smart routing")


class DetectiveQueryResponse(BaseModel):
    """Structured investigation plan derived from natural language query."""

    query: str = Field(..., description="Original user query")
    recommended_variables: list[str] = Field(..., description="Candidate NASA variable identifiers", json_schema_extra={"example": ["GWETROOT", "PRECTOTCORR"]})
    recommended_region_id: str | None = Field(default=None, description="Curated region ID if applicable", json_schema_extra={"example": "amazon_basin"})
    target_coordinates: Coordinates | None = Field(default=None, description="Suggested geographical coordinates")
    hypothesis: str = Field(..., description="Scientific hypothesis and rationale for the investigation")
    model_used: str = Field(..., description="Model that generated the response")
    is_fallback: bool = Field(default=False, description="Whether deterministic offline fallback was used")
