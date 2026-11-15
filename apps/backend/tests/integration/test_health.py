"""Tests for /health endpoint (critical contract with Electron desktop)."""


def test_health_check_returns_200_and_actual_cache_status(client, isolated_cache):
    """Verify /health satisfies Brandon's Electron diagnostic check."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "version" in data
    assert data["version"] == "2.1.0"
    assert "offline_demo_ready" in data
    assert "cached_regions" in data
    assert isinstance(data["cached_regions"], list)
    assert data["cached_regions"] == isolated_cache.get_cached_region_ids()
    assert data["offline_demo_ready"] is bool(data["cached_regions"])
    assert "timestamp" in data
