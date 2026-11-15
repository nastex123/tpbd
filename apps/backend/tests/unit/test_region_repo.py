"""Unit tests for RegionRepository."""
from app.repositories.region_repository import RegionRepository


def test_region_repository_lookup():
    """Unit test for RegionRepository lookup by ID and list_all."""
    repo = RegionRepository()
    all_regions = repo.list_all()
    assert len(all_regions) == 12

    amazon = repo.get_by_id("amazon")
    assert amazon is not None
    assert amazon.name == "Amazon Basin (Manaus)"
    assert amazon.center_coordinates.latitude == -3.1
    assert amazon.biome_category == "Tropical Rainforest"

    # Case-insensitive checks
    assert repo.get_by_id("GUAJIRA") is not None
    assert repo.get_by_id("SaHeL") is not None
    assert repo.get_by_id("ARCTIC_SVALBARD") is not None
    assert repo.get_by_id("MEDITERRANEAN_SPAIN") is not None

    # Missing region
    assert repo.get_by_id("non_existent_region") is None


def test_region_coordinates_and_data_integrity():
    """Ensure all 12 regions have lawful coordinates and complete metadata."""
    repo = RegionRepository()
    for r in repo.list_all():
        assert -90.0 <= r.center_coordinates.latitude <= 90.0
        assert -180.0 <= r.center_coordinates.longitude <= 180.0
        assert len(r.name) > 3
        assert len(r.description) > 10
        assert len(r.scientific_context) > 10
        assert "0.5° grid" in r.representative_cell


def test_teleconnection_pairs():
    """Verify teleconnection pairs point to valid existing regions."""
    repo = RegionRepository()
    pairs = repo.list_teleconnection_pairs()
    assert len(pairs) == 3

    for p in pairs:
        assert p["pair_id"] is not None
        region_a = repo.get_by_id(p["region_a_id"])
        region_b = repo.get_by_id(p["region_b_id"])
        assert region_a is not None, f"Region A '{p['region_a_id']}' in pair {p['pair_id']} not found"
        assert region_b is not None, f"Region B '{p['region_b_id']}' in pair {p['pair_id']} not found"
        assert region_a.region_id != region_b.region_id
