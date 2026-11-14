"""Tests for /api/v1/regions endpoints and RegionRepository."""
from app.repositories.region_repository import RegionRepository


def test_list_regions_returns_200_and_curated_regions(client):
    """Verify GET /api/v1/regions returns 200 with all 4 curated benchmark regions."""
    response = client.get("/api/v1/regions")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 4

    region_ids = [r["region_id"] for r in data]
    assert "amazon" in region_ids
    assert "guajira" in region_ids
    assert "sahel" in region_ids
    assert "australia_se" in region_ids


def test_regions_schema_integrity(client):
    """Verify each region conforms to the OpenAPI specification."""
    response = client.get("/api/v1/regions")
    assert response.status_code == 200

    data = response.json()
    for region in data:
        assert "region_id" in region
        assert "name" in region
        assert "center_coordinates" in region
        coords = region["center_coordinates"]
        assert -90.0 <= coords["latitude"] <= 90.0
        assert -180.0 <= coords["longitude"] <= 180.0
        assert "representative_cell" in region
        assert "description" in region
        assert "scientific_context" in region


def test_region_repository_unit():
    """Unit test for RegionRepository lookup."""
    repo = RegionRepository()
    all_regions = repo.list_all()
    assert len(all_regions) == 4

    amazon = repo.get_by_id("amazon")
    assert amazon is not None
    assert amazon.name == "Amazon Basin (Manaus)"
    assert amazon.center_coordinates.latitude == -3.1

    # Case-insensitive check
    assert repo.get_by_id("GUAJIRA") is not None

    # Missing region
    assert repo.get_by_id("non_existent_region") is None
