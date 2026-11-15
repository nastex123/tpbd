"""Integration tests ensuring AI endpoints surface provider availability honestly."""
import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_ai_service
from app.clients.gemini_client import GeminiClient
from app.main import app
from app.services.ai_service import AIService


@pytest.fixture
def client():
    app.dependency_overrides[get_ai_service] = lambda: AIService(GeminiClient(api_key=""))
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_ai_service, None)


def test_model_list_is_empty_when_gemini_is_not_configured(client):
    response = client.get("/api/v1/ai/models")

    assert response.status_code == 200
    assert response.json()["models"] == []
    assert response.json()["active_api_key_configured"] is False


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        ("/api/v1/ai/investigate", {"query": "Where is drought worsening?", "model": "auto"}),
        ("/api/v1/ai/explain-trend", {
            "variable_id": "T2M", "location_name": "Amazon Basin",
            "direction": "increasing_significant", "rate_per_decade": 0.35,
            "rate_unit": "°C/decade", "p_value": 0.0021, "model": "auto",
        }),
        ("/api/v1/ai/audio-brief", {"text": "NASA climate trend report.", "voice": "Puck", "model": "auto"}),
    ],
)
def test_generation_endpoints_return_unavailable_without_key(client, path, payload):
    response = client.post(path, json=payload)

    assert response.status_code == 503
    assert response.headers["content-type"].startswith("application/problem+json")
    assert "Gemini API Key" in response.json()["title"]
