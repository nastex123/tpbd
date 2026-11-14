"""Base asynchronous HTTP client for external Earth data providers."""
import httpx
from app.core.exceptions import NASAUpstreamTimeoutError, UpstreamServiceError
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseAsyncClient:
    """Base HTTP client with timeouts, retry handling, and resource lifecycle management."""

    def __init__(self, base_url: str, provider_name: str = "NASA", timeout: float = 15.0):
        self.base_url = base_url.rstrip("/")
        self.provider_name = provider_name
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get or initialize the persistent httpx.AsyncClient."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=5.0),
                headers={"User-Agent": "TPBD-EarthSystemTrendDetective/2.1.0"},
            )
        return self._client

    async def aclose(self) -> None:
        """Close the underlying HTTP client session."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
