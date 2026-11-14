"""Time series domain service for data acquisition, normalization, and caching."""
from app.clients.power_client import PowerClient
from app.repositories.cache_repository import CacheRepository
from app.repositories.region_repository import RegionRepository
from app.services.catalog_service import CatalogService
from app.schemas.series import TimeSeriesResponse, DataPoint
from app.schemas.common import Coordinates
from app.core.exceptions import NotFoundError, NASAUpstreamTimeoutError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class SeriesService:
    """Orchestrates time series acquisition, missing-value normalization, and caching."""

    def __init__(
        self,
        power_client: PowerClient,
        cache_repo: CacheRepository,
        catalog_service: CatalogService,
        region_repo: RegionRepository,
    ):
        self.power_client = power_client
        self.cache_repo = cache_repo
        self.catalog_service = catalog_service
        self.region_repo = region_repo

    async def get_time_series(
        self,
        variable_id: str,
        lat: float,
        lon: float,
        start_year: int,
        end_year: int,
        location_name: str | None = None,
        offline_only: bool = False,
    ) -> TimeSeriesResponse:
        """Acquire normalized historical time series with cache-first lookup and offline resilience."""
        var_meta = self.catalog_service.get_variable_by_id(variable_id)
        if not var_meta:
            raise NotFoundError(resource="Variable", identifier=variable_id)

        # 1. Check local cache (exact match)
        cached_dict = self.cache_repo.get_series(variable_id, lat, lon, start_year, end_year)
        if cached_dict:
            logger.info("Serving %s series for (%.2f, %.2f) from SQLite cache", variable_id, lat, lon)
            cached_dict["is_cached"] = True
            return TimeSeriesResponse.model_validate(cached_dict)

        if offline_only:
            # Fallback to any cached period for location if exact match missing
            any_cached = self.cache_repo.find_any_series(variable_id, lat, lon)
            if any_cached:
                any_cached["is_cached"] = True
                return TimeSeriesResponse.model_validate(any_cached)
            raise NotFoundError(resource="Cached observations for", identifier=f"{variable_id} at ({lat:.2f}, {lon:.2f})")

        # 2. Cache miss: Fetch from upstream NASA POWER with fallback
        logger.info("Fetching %s from NASA POWER for (%.2f, %.2f) [%d-%d]", variable_id, lat, lon, start_year, end_year)
        community_code = var_meta.data_community.split()[0] if getattr(var_meta, "data_community", None) else "AG"

        try:
            raw_data = await self.power_client.fetch_monthly_point(
                variable_id=variable_id,
                latitude=lat,
                longitude=lon,
                start_year=start_year,
                end_year=end_year,
                community=community_code,
            )
        except (NASAUpstreamTimeoutError, UpstreamServiceError) as upstream_err:
            fallback = self.cache_repo.find_any_series(variable_id, lat, lon)
            if fallback:
                logger.warning(
                    "NASA POWER failed (%s). Serving fallback cached observations for %s (%.2f, %.2f)",
                    upstream_err, variable_id, lat, lon
                )
                fallback["is_cached"] = True
                return TimeSeriesResponse.model_validate(fallback)
            raise upstream_err

        # 3. Normalize series
        normalized_response = self._normalize_power_payload(
            raw_data=raw_data,
            variable_id=variable_id,
            lat=lat,
            lon=lon,
            start_year=start_year,
            end_year=end_year,
            location_name=location_name,
            unit=var_meta.unit,
            provider=var_meta.provider,
        )

        # 4. Store in local cache
        self.cache_repo.store_series(
            variable_id=variable_id,
            lat=lat,
            lon=lon,
            start_year=start_year,
            end_year=end_year,
            payload=normalized_response.model_dump(),
        )

        return normalized_response

    def _normalize_power_payload(
        self,
        raw_data: dict,
        variable_id: str,
        lat: float,
        lon: float,
        start_year: int,
        end_year: int,
        location_name: str | None,
        unit: str,
        provider,
    ) -> TimeSeriesResponse:
        """Normalize NASA POWER raw JSON into standard TimeSeriesResponse."""
        param_dict = raw_data.get("properties", {}).get("parameter", {}).get(variable_id.upper(), {})

        data_points: list[DataPoint] = []
        valid_count = 0
        missing_count = 0

        # Sort chronological keys: format YYYYMM (filter out month 13 annual summary)
        for date_key in sorted(param_dict.keys()):
            if len(date_key) != 6:
                continue

            year_str = date_key[:4]
            month_str = date_key[4:6]

            # Skip annual average / sum month 13
            if month_str == "13":
                continue

            formatted_date = f"{year_str}-{month_str}"
            val = param_dict[date_key]

            # NASA POWER fill value is -999.0
            if val is None or val <= -999.0 or val == -999:
                data_points.append(DataPoint(date=formatted_date, value=None, quality="missing"))
                missing_count += 1
            else:
                data_points.append(DataPoint(date=formatted_date, value=round(float(val), 4), quality="observed"))
                valid_count += 1

        resolved_name = location_name or f"Coordinates ({lat:.2f}, {lon:.2f})"
        rep_cell = f"{round(lat, 3)}, {round(lon, 3)} (0.5° grid)"

        return TimeSeriesResponse(
            variable_id=variable_id.upper(),
            unit=unit,
            provider=provider,
            location_name=resolved_name,
            query_coordinates=Coordinates(latitude=lat, longitude=lon),
            representative_grid_cell=rep_cell,
            spatial_resolution="0.5° x 0.5° (~50 km)",
            temporal_range=f"{start_year}-01 to {end_year}-12",
            sample_count=len(data_points),
            valid_count=valid_count,
            missing_count=missing_count,
            is_cached=False,
            points=data_points,
        )

    @staticmethod
    def validate_series_compatibility(series_a: TimeSeriesResponse, series_b: TimeSeriesResponse) -> None:
        """Ensure two time series are scientifically compatible for comparison (CA-05)."""
        from app.core.exceptions import AppException
        from fastapi import status

        if series_a.unit != series_b.unit:
            raise AppException(
                title="Incompatible Series Units",
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot compare variables with incompatible units: '{series_a.variable_id}' ({series_a.unit}) "
                    f"vs '{series_b.variable_id}' ({series_b.unit})."
                ),
                error_type="https://tpbd.nasa.gov/errors/incompatible-units",
            )
