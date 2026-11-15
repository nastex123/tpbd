"""NASA POWER CMIP6 projection service client."""
import httpx
from app.clients.base import BaseAsyncClient
from app.core.exceptions import NASAUpstreamTimeoutError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class ProjectionClient(BaseAsyncClient):
    """Reads model catalogs and monthly point projections from NASA POWER."""

    def __init__(self, timeout: float = 20.0):
        super().__init__(base_url="https://power.larc.nasa.gov", provider_name="NASA POWER Projection API", timeout=timeout)

    async def _get_json(self, endpoint: str, params: dict) -> dict:
        client = await self.get_client()
        try:
            response = await client.get(endpoint, params=params)
        except httpx.TimeoutException as exc:
            raise NASAUpstreamTimeoutError(provider="NASA POWER Projection API", timeout_seconds=self.timeout) from exc
        except httpx.RequestError as exc:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Network request failed.") from exc

        if response.status_code >= 500:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail=f"Server returned status {response.status_code}.")
        if response.status_code >= 400:
            raise UpstreamServiceError(
                provider="NASA POWER Projection API",
                detail=f"NASA rejected the request (HTTP {response.status_code}).",
                status_code=422 if response.status_code == 422 else 400,
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Response was not valid JSON.") from exc
        if not isinstance(payload, dict):
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Response had an invalid structure.")
        return payload

    async def list_models(self, temporal: str = "monthly") -> dict:
        return await self._get_json("/api/projection/models", {"temporal": temporal})

    async def fetch_monthly_point(
        self,
        variable_id: str,
        community: str,
        latitude: float,
        longitude: float,
        start_year: int,
        end_year: int,
        scenario: str,
        model: str,
    ) -> dict:
        params = {
            "parameters": variable_id,
            "community": community,
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "start": f"{start_year}01",
            "end": f"{end_year}12",
            "format": "JSON",
            "time-standard": "UTC",
            "scenario": scenario,
            "model": model,
        }
        logger.debug("Requesting NASA POWER projections for %s / %s.", variable_id, scenario)
        return await self._get_json("/api/projection/monthly/point", params)
