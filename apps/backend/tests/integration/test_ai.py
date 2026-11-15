"""Integration tests for AI endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_ai_models_returns_roster(client):
    """Verify GET /api/v1/ai/models lists the supported Gemini model portfolio."""
    res = client.get("/api/v1/ai/models")
    assert res.status_code == 200
    data = res.json()

    assert "models" in data
    assert len(data["models"]) >= 15
    assert data["default_model"] == "gemini-3.8-flash"
    assert "active_api_key_configured" in data

    flash_38 = next((m for m in data["models"] if m["model_id"] == "gemini-3.8-flash"), None)
    assert flash_38 is not None
    assert "text" in flash_38["capabilities"]


def test_post_ai_investigate_fallback_success(client):
    """Verify POST /api/v1/ai/investigate returns structured recommendations."""
    payload = {
        "query": "Where is precipitation declining in the Amazon basin?",
        "model": "auto",
    }
    res = client.post("/api/v1/ai/investigate", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["query"] == payload["query"]
    assert "PRECTOTCORR" in data["recommended_variables"] or "GWETROOT" in data["recommended_variables"]
    assert data["recommended_region_id"] == "amazon_basin"
    assert "hypothesis" in data
    assert len(data["hypothesis"]) > 10
