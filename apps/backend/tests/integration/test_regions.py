"""Integration tests for /api/v1/regions endpoints."""


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
