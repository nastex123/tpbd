"""NASA POWER Monthly Point API client adapter."""
import httpx
from app.clients.base import BaseAsyncClient
from app.core.exceptions import NASAUpstreamTimeoutError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class PowerClient(BaseAsyncClient):
    """Client for NASA POWER Monthly and Annual Temporal API."""

    BASE_URL = "https://power.larc.nasa.gov"

    def __init__(self, timeout: float = 15.0):
        super().__init__(base_url=self.BASE_URL, provider_name="NASA POWER", timeout=timeout)

    async def fetch_monthly_point(
        self,
        variable_id: str,
        latitude: float,
        longitude: float,
        start_year: int,
        end_year: int,
        community: str = "AG",
    ) -> dict:
        """Fetch monthly time series for a single geographic point."""
        client = await self.get_client()
        endpoint = "/api/temporal/monthly/point"
        params = {
            "parameters": variable_id.upper(),
            "community": community.upper(),
            "longitude": round(longitude, 4),
            "latitude": round(latitude, 4),
            "start": start_year,
            "end": end_year,
            "format": "JSON",
        }

        try:
            logger.debug("Requesting NASA POWER: %s with params %s", endpoint, params)
            response = await client.get(endpoint, params=params)
        except httpx.TimeoutException as exc:
            logger.error("NASA POWER request timed out: %s", exc)
            raise NASAUpstreamTimeoutError(provider="NASA POWER", timeout_seconds=self.timeout) from exc
        except httpx.RequestError as exc:
            logger.error("NASA POWER network communication failure: %s", exc)
            raise UpstreamServiceError(provider="NASA POWER", detail=str(exc)) from exc

        if response.status_code >= 500:
            logger.error("NASA POWER upstream server error: %d - %s", response.status_code, response.text)
            raise UpstreamServiceError(
                provider="NASA POWER",
                detail=f"Server returned status {response.status_code}",
                status_code=502,
            )

        if response.status_code >= 400:
            logger.warning("NASA POWER bad request from upstream: %d - %s", response.status_code, response.text)
            raise UpstreamServiceError(
                provider="NASA POWER",
                detail=f"Upstream query rejected ({response.status_code}): {response.text[:200]}",
                status_code=400,
            )

        return response.json()
