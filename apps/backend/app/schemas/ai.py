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


class TrendExplanationRequest(BaseModel):
    """Request payload for scientific trend synthesis and teleconnection explanation."""

    variable_id: str = Field(..., description="Canonical variable identifier", json_schema_extra={"example": "T2M"})
    location_name: str = Field(..., description="Location or region name", json_schema_extra={"example": "Amazon Basin"})
    direction: str = Field(..., description="Trend direction classification", json_schema_extra={"example": "increasing_significant"})
    rate_per_decade: float = Field(..., description="Rate of change in units per decade", json_schema_extra={"example": 0.35})
    rate_unit: str = Field(..., description="Physical rate unit string", json_schema_extra={"example": "°C/decade"})
    p_value: float = Field(..., description="Statistical significance p-value", json_schema_extra={"example": 0.0021})
    change_point_date: str | None = Field(default=None, description="Structural break date if detected", json_schema_extra={"example": "2005-08"})
    regime_shift_type: str | None = Field(default=None, description="Regime shift classification if detected", json_schema_extra={"example": "accelerating_increase"})
    model: str = Field(default="auto", description="Target Gemini model or 'auto' for deep thinking model routing")


class TrendExplanationResponse(BaseModel):
    """Publication-grade scientific synthesis of Earth system trend."""

    variable_id: str = Field(..., description="Canonical variable identifier")
    location_name: str = Field(..., description="Location or region name")
    executive_summary: str = Field(..., description="Concise high-level finding for general audiences")
    mechanisms_and_drivers: str = Field(..., description="Physical Earth system atmospheric/oceanic processes driving the trend")
    scientific_uncertainty: str = Field(..., description="Explicit discussion of uncertainty, observational limits, and caveats")
    recommended_next_steps: list[str] = Field(..., description="Actionable investigative follow-ups for researchers")
    model_used: str = Field(..., description="Model that generated the synthesis")
    is_fallback: bool = Field(default=False, description="Whether deterministic offline fallback was used")


class AudioBriefRequest(BaseModel):
    """Request payload for Mission Control spoken audio debrief."""

    text: str = Field(..., min_length=10, max_length=2000, description="Debrief text to synthesize into spoken speech")
    voice: str = Field(default="Puck", description="Voice profile identifier")
    model: str = Field(default="auto", description="Target Gemini TTS model or 'auto' for gemini-3.8-flash-tts")


class AudioBriefResponse(BaseModel):
    """Spoken audio debrief payload encoded in Base64 for instant HTML5 audio playback."""

    audio_base64: str = Field(..., description="Base64-encoded audio bytes")
    mime_type: str = Field(default="audio/wav", description="Audio container MIME type")
    voice_used: str = Field(..., description="Voice name applied")
    model_used: str = Field(..., description="TTS model applied")
    is_fallback: bool = Field(default=False, description="Whether deterministic stub fallback was used")
