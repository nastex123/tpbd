"""Unit tests for Gemini AI client and smart model router (HU-27)."""
import pytest
from unittest.mock import AsyncMock
from app.clients.gemini_client import GeminiClient
from app.services.ai_service import AIService
from app.schemas.ai import DetectiveQueryRequest


def test_gemini_client_roster_completeness():
    """Verify supported model roster contains user-requested models."""
    client = GeminiClient(api_key="mock_key")
    models = client.list_models()
    model_ids = [m.model_id for m in models]

    assert "gemini-3.8-flash" in model_ids
    assert "gemini-3.8-live-extended-thinking" in model_ids
    assert "gemini-3.8-flash-tts" in model_ids
    assert "gemini-3.6-flash" in model_ids
    assert "gemini-3.5-flash-lite" in model_ids
    assert "gemini-3.1-pro-preview" in model_ids
    assert "gemini-3-pro-image" in model_ids
    assert len(models) >= 15


def test_gemini_client_model_resolution():
    """Verify smart routing resolution for auto mode."""
    client = GeminiClient(api_key="mock_key")

    assert client.resolve_model("auto", task="query") == "gemini-3.8-flash"
    assert client.resolve_model("auto", task="thinking") == "gemini-3.8-live-extended-thinking"
    assert client.resolve_model("auto", task="tts") == "gemini-3.8-flash-tts"
    assert client.resolve_model("auto", task="vision") == "gemini-3-pro-image"
    # Specific override preserved
    assert client.resolve_model("gemini-3.6-flash", task="query") == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_ai_service_deterministic_fallback():
    """Verify deterministic fallback when no API key is provided."""
    client = GeminiClient(api_key=None)
    service = AIService(gemini_client=client)

    req = DetectiveQueryRequest(query="Where is drought getting worse in the Amazon?")
    res = await service.investigate(req)

    assert res.is_fallback is True
    assert "PRECTOTCORR" in res.recommended_variables or "GWETROOT" in res.recommended_variables
    assert res.recommended_region_id == "amazon_basin"
    assert res.target_coordinates is not None
    assert res.target_coordinates.latitude == -3.4653
    assert "Amazon" in res.hypothesis


@pytest.mark.asyncio
async def test_ai_service_live_gemini_generation():
    """Verify live Gemini parsing with mocked successful API response."""
    client = GeminiClient(api_key="valid_test_key")
    mock_payload = (
        '{\n'
        '  "recommended_variables": ["T2M", "RH2M"],\n'
        '  "recommended_region_id": "sahel_region",\n'
        '  "target_coordinates": {"latitude": 14.5, "longitude": 12.0},\n'
        '  "hypothesis": "Extreme atmospheric heat and dry air advection across the Sahel."\n'
        '}'
    )
    client.generate_content = AsyncMock(return_value=mock_payload)
    service = AIService(gemini_client=client)

    req = DetectiveQueryRequest(query="Analyze heat stress in the Sahel desert")
    res = await service.investigate(req)

    assert res.is_fallback is False
    assert res.recommended_variables == ["T2M", "RH2M"]
    assert res.recommended_region_id == "sahel_region"
    assert res.target_coordinates.latitude == 14.5
    assert "Sahel" in res.hypothesis
    assert res.model_used == "gemini-3.8-flash"


@pytest.mark.asyncio
async def test_ai_service_explain_trend_deterministic():
    """Verify deterministic fallback explanation for trend analysis."""
    from app.schemas.ai import TrendExplanationRequest
    client = GeminiClient(api_key=None)
    service = AIService(gemini_client=client)

    req = TrendExplanationRequest(
        variable_id="T2M",
        location_name="Amazon Basin",
        direction="increasing_significant",
        rate_per_decade=0.35,
        rate_unit="°C/decade",
        p_value=0.0012,
        change_point_date="2005-08",
        regime_shift_type="accelerating_increase",
    )
    res = await service.explain_trend(req)

    assert res.is_fallback is True
    assert res.variable_id == "T2M"
    assert "Amazon Basin" in res.location_name
    assert "increasing significant" in res.executive_summary
    assert "2005-08" in res.executive_summary
    assert len(res.recommended_next_steps) >= 2


@pytest.mark.asyncio
async def test_ai_service_audio_brief_fallback():
    """Verify audio briefing fallback returns valid base64 audio container."""
    from app.schemas.ai import AudioBriefRequest
    client = GeminiClient(api_key=None)
    service = AIService(gemini_client=client)

    req = AudioBriefRequest(text="This is TPBD Mission Control audio debrief.")
    res = await service.generate_audio_brief(req)

    assert res.is_fallback is True
    assert res.mime_type == "audio/wav"
    assert res.audio_base64.startswith("UklGRi")
    assert len(res.audio_base64) > 10
