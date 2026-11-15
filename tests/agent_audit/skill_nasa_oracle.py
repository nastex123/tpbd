"""Skill: NASA Oracle.
Direct queries to official NASA Earthdata & NASA POWER APIs.
Acts as the independent ground truth to verify data integrity, coordinate mapping,
and normalization in the backend.
"""
import sys
from pathlib import Path
from typing import Any

# Ensure apps/backend is in sys.path
backend_root = Path(__file__).resolve().parents[2]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import httpx


class NasaOracle:
    """Ground truth client directly querying official NASA endpoints."""

    POWER_BASE = "https://power.larc.nasa.gov"
    APPEEARS_BASE = "https://appeears.earthdatacloud.nasa.gov/api"

    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout

    async def fetch_power_monthly(
        self,
        variable_id: str,
        lat: float,
        lon: float,
        start_year: int,
        end_year: int,
        community: str = "AG",
    ) -> dict[str, Any] | None:
        """Fetch raw monthly data directly from NASA POWER API."""
        params = {
            "parameters": variable_id.upper(),
            "community": community.upper(),
            "longitude": round(lon, 4),
            "latitude": round(lat, 4),
            "start": start_year,
            "end": end_year,
            "format": "JSON",
        }
        url = f"{self.POWER_BASE}/api/temporal/monthly/point"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                return {"error": f"Upstream HTTP {resp.status_code}", "text": resp.text[:200]}
        except Exception as exc:
            return {"error": f"Connection error: {exc}"}

    async def fetch_power_projection_models(self) -> dict[str, Any] | None:
        """Fetch available CMIP6 models directly from NASA POWER."""
        url = f"{self.POWER_BASE}/api/projection/models"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params={"temporal": "monthly"})
                if resp.status_code == 200:
                    return resp.json()
                return {"error": f"Upstream HTTP {resp.status_code}"}
        except Exception as exc:
            return {"error": f"Connection error: {exc}"}

    async def fetch_appeears_products(self) -> list[dict[str, Any]] | dict[str, str]:
        """Fetch public AppEEARS products catalog directly from NASA."""
        url = f"{self.APPEEARS_BASE}/product"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    return resp.json()
                return {"error": f"Upstream HTTP {resp.status_code}"}
        except Exception as exc:
            return {"error": f"Connection error: {exc}"}

    @staticmethod
    def compare_power_with_backend_series(
        oracle_raw: dict[str, Any],
        backend_series: dict[str, Any],
        variable_id: str,
    ) -> dict[str, Any]:
        """Compare raw NASA POWER parameter values with backend TimeSeriesResponse."""
        discrepancies = []
        param_dict = (
            oracle_raw.get("properties", {})
            .get("parameter", {})
            .get(variable_id.upper(), {})
        )

        backend_points = {pt["date"]: pt for pt in backend_series.get("points", [])}

        month_13_found_in_backend = any(k.endswith("-13") for k in backend_points.keys())
        if month_13_found_in_backend:
            discrepancies.append("Backend included month 13 (annual average) in time series points")

        for date_key, raw_val in param_dict.items():
            if len(date_key) != 6:
                continue
            year, month = date_key[:4], date_key[4:6]
            if month == "13":
                continue

            iso_date = f"{year}-{month}"
            pt = backend_points.get(iso_date)

            if not pt:
                discrepancies.append(f"Date {iso_date} present in NASA POWER but missing in backend series")
                continue

            # Compare value and quality
            if raw_val is None or raw_val <= -999.0 or raw_val == -999:
                if pt.get("value") is not None:
                    discrepancies.append(
                        f"NASA fill value {raw_val} at {iso_date} was not normalized to null (got {pt.get('value')})"
                    )
                if pt.get("quality") != "missing":
                    discrepancies.append(f"Expected quality 'missing' at {iso_date}, got '{pt.get('quality')}'")
            else:
                expected_rounded = round(float(raw_val), 4)
                actual_val = pt.get("value")
                if actual_val is None or abs(actual_val - expected_rounded) > 1e-4:
                    discrepancies.append(
                        f"Value mismatch at {iso_date}: NASA POWER={expected_rounded}, Backend={actual_val}"
                    )
                if pt.get("quality") != "observed":
                    discrepancies.append(f"Expected quality 'observed' at {iso_date}, got '{pt.get('quality')}'")

        return {
            "is_identical": len(discrepancies) == 0,
            "discrepancies_count": len(discrepancies),
            "discrepancies": discrepancies[:10],
            "total_oracle_months_checked": len([k for k in param_dict.keys() if not k.endswith("13")]),
            "backend_points_count": len(backend_points),
        }
