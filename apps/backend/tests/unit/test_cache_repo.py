"""Unit tests for SQLite CacheRepository."""
import tempfile
from pathlib import Path
from app.repositories.cache_repository import CacheRepository


def test_cache_store_and_retrieve():
    """Verify storing and retrieving normalized time series from SQLite."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "test_cache.db"
        repo = CacheRepository(db_path=str(db_path))

        payload = {
            "variable_id": "T2M",
            "unit": "°C",
            "points": [
                {"date": "2020-01", "value": 26.5, "quality": "observed"},
                {"date": "2020-02", "value": None, "quality": "missing"},
            ],
        }

        # Cache miss initially
        assert repo.get_series("T2M", -3.1, -60.0, 2020, 2020) is None

        # Store series
        repo.store_series("T2M", -3.1, -60.0, 2020, 2020, payload)

        # Cache hit
        cached = repo.get_series("T2M", -3.1, -60.0, 2020, 2020)
        assert cached is not None
        assert cached["variable_id"] == "T2M"
        assert len(cached["points"]) == 2
        assert cached["points"][0]["value"] == 26.5
        assert cached["points"][1]["value"] is None


def test_cache_key_precision():
    """Verify coordinate rounding in cache keys (~110m resolution)."""
    k1 = CacheRepository.build_cache_key("T2M", -3.1001, -60.0004, 2000, 2020)
    k2 = CacheRepository.build_cache_key("T2M", -3.1004, -60.0001, 2000, 2020)
    assert k1 == k2
    assert k1 == "T2M:-3.1:-60.0:2000:2020"
