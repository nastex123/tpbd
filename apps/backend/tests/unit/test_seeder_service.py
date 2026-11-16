"""Unit tests for offline demo database seeder service."""
import tempfile
from pathlib import Path
from app.repositories.cache_repository import CacheRepository
from app.services.series_service import SeriesService
from app.services.catalog_service import CatalogService
from app.services.seeder_service import SeederService
from app.repositories.region_repository import RegionRepository
from app.clients.power_client import PowerClient


def test_seeder_populates_curated_regions():
    """Verify SeederService discovers manifest and populates cache."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = str(Path(tmp_dir) / "test_seeder.db")
        cache_repo = CacheRepository(db_path=db_path)
        catalog_svc = CatalogService()
        region_repo = RegionRepository()
        power_client = PowerClient()

        series_svc = SeriesService(
            power_client=power_client,
            cache_repo=cache_repo,
            catalog_service=catalog_svc,
            region_repo=region_repo,
        )

        seeder = SeederService(cache_repo, series_svc, catalog_svc)
        manifest_path = seeder.find_manifest_path()
        assert manifest_path is not None
        assert manifest_path.exists()

        seeded_regions = seeder.seed_all_curated_regions()
        assert len(seeded_regions) >= 2  # At least amazon and guajira
        assert "amazon" in seeded_regions
        assert "guajira" in seeded_regions

        # Check records were inserted
        count = cache_repo.count_cached_entries()
        assert count >= len(seeded_regions)

        # Check cached regions query
        cached_ids = cache_repo.get_cached_region_ids()
        assert "amazon" in cached_ids
        assert "guajira" in cached_ids
