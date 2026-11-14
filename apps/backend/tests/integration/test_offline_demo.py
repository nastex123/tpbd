"""Integration tests for HU-14 Offline Demo Mode and benchmark pre-seeding."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client(isolated_cache):
    """Client backed by an isolated cache pre-seeded with authentic curated fixtures."""
    from app.services.seeder_service import SeederService
    from app.services.series_service import SeriesService
    from app.services.catalog_service import CatalogService
    from app.repositories.region_repository import RegionRepository
    from app.clients.power_client import PowerClient

    cat_svc = CatalogService()
    series_svc = SeriesService(PowerClient(), isolated_cache, cat_svc, RegionRepository())
    seeder = SeederService(isolated_cache, series_svc, cat_svc)
    seeder.seed_all_curated_regions()

    with TestClient(app) as test_client:
        yield test_client



def test_offline_demo_health_check(client):
    """Verify /health reports offline demo cache readiness."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ok"
    assert data["offline_demo_ready"] is True
    assert isinstance(data["cached_regions"], list)
    assert len(data["cached_regions"]) >= 2
    assert "amazon" in data["cached_regions"]


def test_offline_series_retrieval_without_network(client):
    """Verify pre-seeded benchmark series are served strictly from cache with offline=true."""
    res = client.get("/api/v1/series?variable_id=T2M&region_id=amazon&offline=true")
    assert res.status_code == 200
    data = res.json()

    assert data["variable_id"] == "T2M"
    assert data["is_cached"] is True
    assert data["unit"] == "°C"
    assert len(data["points"]) > 100
    assert data["points"][0]["quality"] == "observed"


def test_end_to_end_offline_comparative_investigation(client):
    """Verify complete end-to-end offline investigation: two series + regional comparison."""
    # 1. Fetch Region A offline (Amazon Precipitation)
    res_a = client.get("/api/v1/series?variable_id=PRECTOTCORR&region_id=amazon&offline=true")
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["is_cached"] is True

    # 2. Fetch Region B offline (La Guajira or Sahel Precipitation)
    res_b = client.get("/api/v1/series?variable_id=PRECTOTCORR&region_id=guajira&offline=true")
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["is_cached"] is True

    # 3. Post to /api/v1/analytics/compare
    compare_payload = {
        "variable_id": "PRECTOTCORR",
        "region_a": {
            "location_name": data_a["location_name"],
            "points": data_a["points"],
        },
        "region_b": {
            "location_name": data_b["location_name"],
            "points": data_b["points"],
        },
    }

    res_comp = client.post("/api/v1/analytics/compare", json=compare_payload)
    assert res_comp.status_code == 200
    comp_data = res_comp.json()

    assert comp_data["variable_id"] == "PRECTOTCORR"
    assert comp_data["are_comparable"] is True
    assert comp_data["trend_region_a"]["direction"] in [
        "increasing_significant",
        "decreasing_significant",
        "no_significant_trend",
    ]
    assert comp_data["trend_region_b"]["direction"] in [
        "increasing_significant",
        "decreasing_significant",
        "no_significant_trend",
    ]
    assert "comparative_summary" in comp_data
    assert "drivers_explanation" in comp_data
