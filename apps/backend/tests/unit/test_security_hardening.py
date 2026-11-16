"""Unit tests for security hardening measures (ADR 0009 and Edge Security Audit)."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limit import InMemoryRateLimiter, AIRateLimitMiddleware
from app.clients.appeears_client import AppEEARSClient
from app.main import create_app


def test_production_default_debug_is_false():
    """Verify that settings default to DEBUG=False when no env var is present."""
    # Instantiating Settings directly with debug unset should be False by default definition
    assert Settings.model_fields["DEBUG"].default is False


def test_cors_origins_include_production_vercel():
    """Verify that default CORS origins include Vercel production deployment."""
    default_origins = Settings.model_fields["CORS_ORIGINS"].default
    assert "https://desktop-nastex.vercel.app" in default_origins


def test_appeears_client_logout():
    """Verify that logout actively wipes credentials and tokens from memory."""
    client = AppEEARSClient(token="mock-token-xyz", username="danidev23")
    assert client.is_authenticated() is True
    assert client.get_auth_status().authenticated is True
    assert client.get_auth_status().username == "danidev23"

    client.logout()

    assert client.is_authenticated() is False
    assert client.get_auth_status().authenticated is False
    assert client.get_auth_status().username is None
    assert client.get_auth_status().expiration is None


def test_appeears_logout_endpoint():
    """Verify that POST /api/v1/integrations/appeears/auth/logout purges session."""
    app = create_app()
    with TestClient(app) as test_client:
        response = test_client.post("/api/v1/integrations/appeears/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert "terminated" in data["message"].lower()

        # Follow-up status check must reflect unauthenticated
        status_resp = test_client.get("/api/v1/integrations/appeears/auth/status")
        assert status_resp.status_code == 200
        assert status_resp.json()["authenticated"] is False


def test_in_memory_rate_limiter_sliding_window():
    """Verify that rate limiter blocks after reaching threshold and respects window."""
    limiter = InMemoryRateLimiter(max_requests=3, window_seconds=10.0)
    ip = "192.168.1.100"

    allowed1, _ = limiter.is_allowed(ip)
    allowed2, _ = limiter.is_allowed(ip)
    allowed3, _ = limiter.is_allowed(ip)
    assert allowed1 is True
    assert allowed2 is True
    assert allowed3 is True

    # 4th request must be rejected
    allowed4, retry_after = limiter.is_allowed(ip)
    assert allowed4 is False
    assert retry_after > 0

    # Another IP should still be allowed
    allowed_other, _ = limiter.is_allowed("192.168.1.101")
    assert allowed_other is True

    # Reset clears history
    limiter.reset()
    allowed_again, _ = limiter.is_allowed(ip)
    assert allowed_again is True


def test_ai_rate_limit_middleware_returns_429():
    """Verify that AI Copilot endpoints return HTTP 429 when rate limit is exceeded."""
    limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60.0)
    app = create_app()
    # Find existing middleware or test directly with fresh app
    app.user_middleware.clear()
    app.middleware_stack = None
    app.add_middleware(AIRateLimitMiddleware, limiter=limiter, prefix="/api/v1/ai")
    app.build_middleware_stack()

    with TestClient(app) as test_client:
        # First 2 requests pass through middleware (to route handler)
        test_client.get("/api/v1/ai/models")
        test_client.get("/api/v1/ai/models")

        # 3rd request should be blocked with 429
        blocked = test_client.get("/api/v1/ai/models")
        assert blocked.status_code == 429
        assert blocked.headers.get("retry-after") is not None
        body = blocked.json()
        assert body["status"] == 429
        assert "rate limit exceeded" in body["detail"].lower()
