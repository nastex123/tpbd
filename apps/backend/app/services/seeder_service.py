"""Database seeder to populate local SQLite cache with authentic NASA benchmark fixtures."""
import json
from pathlib import Path
from app.repositories.cache_repository import CacheRepository
from app.services.series_service import SeriesService
from app.services.catalog_service import CatalogService
from app.schemas.catalog import DataSourceProvider
from app.core.logging import get_logger

logger = get_logger(__name__)


class SeederService:
    """Loads authentic NASA POWER fixtures into SQLite cache for zero-latency offline demo execution."""

    def __init__(self, cache_repo: CacheRepository, series_service: SeriesService, catalog_service: CatalogService) -> None:
        self.cache_repo = cache_repo
        self.series_service = series_service
        self.catalog_service = catalog_service

    def find_manifest_path(self) -> Path | None:
        """Locate data/fixtures/manifest.json from root or nested package roots."""
        candidates = [
            Path("data/fixtures/manifest.json"),
            Path("../../data/fixtures/manifest.json"),
            Path("../data/fixtures/manifest.json"),
        ]
        for p in candidates:
            if p.exists():
                return p.resolve()
        return None

    def seed_all_curated_regions(self) -> list[str]:
        """Parse fixtures cataloged in manifest.json and pre-populate SQLite cache."""
        manifest_path = self.find_manifest_path()
        if not manifest_path or not manifest_path.exists():
            logger.warning("Manifest not found. Skipping cache pre-seeding.")
            return []

        fixtures_dir = manifest_path.parent
        try:
            manifest_data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Failed to parse %s: %s", manifest_path, exc)
            return []

        seeded_regions: set[str] = set()

        for entry in manifest_data.get("fixtures", []):
            rel_file = entry.get("file")
            var_id = entry.get("variable_id")
            loc = entry.get("location", {})
            region_id = loc.get("region_id")
            lat = float(loc.get("latitude"))
            lon = float(loc.get("longitude"))
            loc_name = loc.get("name")
            unit = entry.get("unit", "units")

            fixture_file = fixtures_dir / rel_file
            if not fixture_file.exists():
                logger.warning("Fixture file not found: %s", fixture_file)
                continue

            try:
                raw_json = json.loads(fixture_file.read_text(encoding="utf-8"))
                # Parse temporal range e.g. "1990-01 to 2024-12"
                tr = entry.get("temporal_range", "1990-01 to 2024-12")
                start_year = int(tr[:4])
                end_year = int(tr[-7:-3])

                normalized = self.series_service._normalize_power_payload(
                    raw_data=raw_json,
                    variable_id=var_id,
                    lat=lat,
                    lon=lon,
                    start_year=start_year,
                    end_year=end_year,
                    location_name=loc_name,
                    unit=unit,
                    provider=DataSourceProvider.NASA_POWER,
                )

                self.cache_repo.store_series(
                    variable_id=var_id,
                    lat=lat,
                    lon=lon,
                    start_year=start_year,
                    end_year=end_year,
                    payload=normalized.model_dump(),
                )

                if region_id:
                    seeded_regions.add(region_id)
                logger.info("Successfully seeded %s for region %s in cache", var_id, region_id)
            except Exception as exc:
                logger.error("Error seeding fixture %s: %s", rel_file, exc)

        # Pre-seed comprehensive offline coverage for all 12 benchmark regions (T2M, PRECTOTCORR, MOD13Q1_NDVI)
        try:
            import sys
            backend_dir = Path(__file__).resolve().parent.parent.parent
            if str(backend_dir) not in sys.path:
                sys.path.insert(0, str(backend_dir))
            from seed_demo_cache import seed_database
            seed_database(self.cache_repo.db_path)
            from app.repositories.region_repository import CURATED_REGIONS
            for r in CURATED_REGIONS:
                seeded_regions.add(r.region_id)
        except Exception as exc:
            logger.debug("Demo cache pre-seeding helper notice: %s", exc)

        return sorted(list(seeded_regions))
