"""Unit tests for Gemini API integration; provider responses are isolated to tests."""
from unittest.mock import AsyncMock

import httpx
import pytest

from app.clients.gemini_client import GeminiClient
from app.core.exceptions import AppException
from app.schemas.ai import AudioBriefRequest, DetectiveQueryRequest, TrendExplanationRequest
from app.services.ai_service import AIService


def response(payload: dict, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json=payload, request=httpx.Request("GET", "https://gemini.test"))


def test_gemini_model_routing_uses_documented_identifiers():
    client = GeminiClient(api_key="test-key")

    assert client.resolve_model("auto", task="query") == "gemini-3.8-flash"
    assert client.resolve_model("auto", task="thinking") == "gemini-3.8-flash"
    assert client.resolve_model("auto", task="tts") == "gemini-3.8-flash-tts"
    assert client.resolve_model("auto", task="vision") == "gemini-3-pro-image"
    assert client.resolve_model("custom-model", task="query") == "custom-model"


@pytest.mark.asyncio
async def test_list_models_reads_live_catalog_and_follows_pages(monkeypatch):
    client = GeminiClient(api_key="test-key")
    get = AsyncMock(side_effect=[
        response({
            "models": [
                {"name": "models/gemini-test", "displayName": "Gemini test", "description": "Provider description", "inputTokenLimit": 8192, "supportedGenerationMethods": ["generateContent"]},
                {"name": "models/embed-only", "supportedGenerationMethods": ["embedContent"]},
            ],
            "nextPageToken": "page-2",
        }),
        response({
            "models": [
                {"name": "models/gemini-tts-test", "displayName": "Gemini TTS", "inputTokenLimit": 4096, "supportedGenerationMethods": ["generateContent"]},
            ],
        }),
    ])
    monkeypatch.setattr(httpx.AsyncClient, "get", get)

    models = await client.list_models()

    assert [model.model_id for model in models] == ["gemini-test", "gemini-tts-test"]
    assert models[0].display_name == "Gemini test"
    assert models[0].recommended_use == "Provider description"
    assert models[0].context_window == 8192
    assert models[1].context_window == 4096
    assert "tts" in [capability.value for capability in models[1].capabilities]
    assert get.await_count == 2
    assert get.await_args_list[1].kwargs["params"]["pageToken"] == "page-2"


@pytest.mark.asyncio
async def test_no_api_key_does_not_generate_fallback_investigation():
    service = AIService(gemini_client=GeminiClient(api_key=""))

    with pytest.raises(AppException) as exc_info:
        await service.investigate(DetectiveQueryRequest(query="Where is drought worsening in Amazon?"))

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_live_investigation_uses_gemini_response():
    client = GeminiClient(api_key="test-key")
    client.generate_content = AsyncMock(return_value='''{
      "recommended_variables": ["PRECTOTCORR", "GWETROOT"],
      "recommended_region_id": "amazon_basin",
      "target_coordinates": {"latitude": -3.46, "longitude": -62.21},
      "hypothesis": "Test the relation between rainfall deficits and root-zone soil moisture."
    }''')
    service = AIService(gemini_client=client)

    result = await service.investigate(DetectiveQueryRequest(query="Drought in the Amazon"))

    assert result.recommended_variables == ["PRECTOTCORR", "GWETROOT"]
    assert result.target_coordinates.latitude == -3.46
    client.generate_content.assert_awaited_once()


@pytest.mark.asyncio
async def test_invalid_model_json_is_reported_as_upstream_error():
    client = GeminiClient(api_key="test-key")
    client.generate_content = AsyncMock(return_value="not JSON")
    service = AIService(gemini_client=client)

    with pytest.raises(AppException) as exc_info:
        await service.investigate(DetectiveQueryRequest(query="Analyze heat trends"))

    assert exc_info.value.status_code == 502


@pytest.mark.asyncio
async def test_trend_explanation_is_not_synthesized_without_gemini():
    service = AIService(gemini_client=GeminiClient(api_key=""))
    request = TrendExplanationRequest(
        variable_id="T2M", location_name="Amazon Basin",
        direction="increasing_significant", rate_per_decade=0.35,
        rate_unit="°C/decade", p_value=0.0012,
    )

    with pytest.raises(AppException) as exc_info:
        await service.explain_trend(request)

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_tts_returns_real_audio_mime_type():
    client = GeminiClient(api_key="test-key")
    client.generate_audio_tts = AsyncMock(return_value=("YXVkaW8=", "audio/L16;codec=pcm;rate=24000"))
    service = AIService(gemini_client=client)

    result = await service.generate_audio_brief(AudioBriefRequest(text="Climate report for testing."))

    assert result.audio_base64 == "YXVkaW8="
    assert result.mime_type == "audio/L16;codec=pcm;rate=24000"
