"""Unit tests for RegionRepository."""
from app.repositories.region_repository import RegionRepository


def test_region_repository_lookup():
    """Unit test for RegionRepository lookup by ID."""
    repo = RegionRepository()
    all_regions = repo.list_all()
    assert len(all_regions) == 4

    amazon = repo.get_by_id("amazon")
    assert amazon is not None
    assert amazon.name == "Amazon Basin (Manaus)"
    assert amazon.center_coordinates.latitude == -3.1

    # Case-insensitive check
    assert repo.get_by_id("GUAJIRA") is not None
    assert repo.get_by_id("SaHeL") is not None

    # Missing region
    assert repo.get_by_id("non_existent_region") is None
