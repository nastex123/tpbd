"""SQLite cache repository for normalized time series observations."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheRepository:
    """Local SQLite-backed cache for Earth science time series."""

    def __init__(self, db_path: str | None = None):
        self.db_path = Path(db_path or settings.CACHE_DB_PATH)
        self._ensure_tables()

    def _get_connection(self) -> sqlite3.Connection:
        """Create a connection to SQLite ensuring parent directory exists."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_tables(self) -> None:
        """Create cache table schema and index if not present."""
        conn = self._get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS time_series_cache (
                        cache_key TEXT PRIMARY KEY,
                        variable_id TEXT NOT NULL,
                        latitude REAL NOT NULL,
                        longitude REAL NOT NULL,
                        start_year INTEGER NOT NULL,
                        end_year INTEGER NOT NULL,
                        payload_json TEXT NOT NULL,
                        cached_at TEXT NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_series_lookup
                    ON time_series_cache (variable_id, latitude, longitude, start_year, end_year)
                    """
                )
        finally:
            conn.close()

    @staticmethod
    def build_cache_key(variable_id: str, lat: float, lon: float, start_year: int, end_year: int) -> str:
        """Generate deterministic cache key with rounded coordinate precision (3 decimals ~ 110m)."""
        rounded_lat = round(lat, 3)
        rounded_lon = round(lon, 3)
        return f"{variable_id.upper()}:{rounded_lat}:{rounded_lon}:{start_year}:{end_year}"

    def get_series(self, variable_id: str, lat: float, lon: float, start_year: int, end_year: int) -> dict | None:
        """Retrieve cached series payload by parameter and coordinate bounds."""
        key = self.build_cache_key(variable_id, lat, lon, start_year, end_year)
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                "SELECT payload_json FROM time_series_cache WHERE cache_key = ?",
                (key,),
            )
            row = cursor.fetchone()
            if row:
                logger.debug("Cache hit for %s", key)
                return json.loads(row["payload_json"])
        finally:
            conn.close()
        logger.debug("Cache miss for %s", key)
        return None

    def find_any_series(self, variable_id: str, lat: float, lon: float) -> dict | None:
        """Find the most recent cached series for coordinates regardless of exact year bounds."""
        key_prefix = f"{variable_id.upper()}:{round(lat, 3)}:{round(lon, 3)}:%"
        conn = self._get_connection()
        try:
            cursor = conn.execute(
                """
                SELECT payload_json FROM time_series_cache
                WHERE cache_key LIKE ?
                ORDER BY cached_at DESC LIMIT 1
                """,
                (key_prefix,),
            )
            row = cursor.fetchone()
            if row:
                logger.debug("Found fallback cached series for %s with prefix %s", variable_id, key_prefix)
                return json.loads(row["payload_json"])
        finally:
            conn.close()
        return None

    def count_cached_entries(self) -> int:
        """Count total cached time series records."""
        conn = self._get_connection()
        try:
            cursor = conn.execute("SELECT COUNT(*) as total FROM time_series_cache")
            row = cursor.fetchone()
            return row["total"] if row else 0
        finally:
            conn.close()

    def store_series(
        self, variable_id: str, lat: float, lon: float, start_year: int, end_year: int, payload: dict
    ) -> None:
        """Upsert a serialized time series payload into the SQLite cache."""
        key = self.build_cache_key(variable_id, lat, lon, start_year, end_year)
        now_iso = datetime.now(timezone.utc).isoformat()
        payload_str = json.dumps(payload)

        conn = self._get_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO time_series_cache (cache_key, variable_id, latitude, longitude, start_year, end_year, payload_json, cached_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(cache_key) DO UPDATE SET
                        payload_json = excluded.payload_json,
                        cached_at = excluded.cached_at
                    """,
                    (key, variable_id.upper(), round(lat, 3), round(lon, 3), start_year, end_year, payload_str, now_iso),
                )
        finally:
            conn.close()
        logger.debug("Stored series cache for %s", key)
