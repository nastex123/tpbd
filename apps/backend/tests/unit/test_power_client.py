"""Unit tests for NASA POWER API client adapter."""
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from app.clients.power_client import PowerClient
from app.core.exceptions import NASAUpstreamTimeoutError, UpstreamServiceError


@pytest.mark.asyncio
async def test_power_client_success():
    """Verify PowerClient formats parameters and returns JSON payload."""
    client = PowerClient(timeout=5.0)

    mock_response = httpx.Response(
        status_code=200,
        json={
            "properties": {
                "parameter": {
                    "T2M": {"202001": 26.5, "202002": 27.1}
                }
            },
            "header": {"sources": ["MERRA2"]},
        },
        request=httpx.Request("GET", "https://power.larc.nasa.gov"),
    )

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        data = await client.fetch_monthly_point("T2M", -3.1, -60.0, 2020, 2020)

        assert "properties" in data
        assert data["properties"]["parameter"]["T2M"]["202001"] == 26.5
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert kwargs["params"]["parameters"] == "T2M"
        assert kwargs["params"]["latitude"] == -3.1
        assert kwargs["params"]["longitude"] == -60.0
        assert kwargs["params"]["start"] == 2020
        assert kwargs["params"]["end"] == 2020

    await client.aclose()


@pytest.mark.asyncio
async def test_power_client_timeout():
    """Verify PowerClient maps TimeoutException to NASAUpstreamTimeoutError."""
    client = PowerClient(timeout=1.0)

    with patch.object(httpx.AsyncClient, "get", side_effect=httpx.TimeoutException("Read timed out")):
        with pytest.raises(NASAUpstreamTimeoutError) as exc_info:
            await client.fetch_monthly_point("T2M", -3.1, -60.0, 2020, 2020)
        assert exc_info.value.status_code == 504
        assert "timed out" in exc_info.value.detail

    await client.aclose()


@pytest.mark.asyncio
async def test_power_client_server_error():
    """Verify PowerClient maps 5xx responses to UpstreamServiceError."""
    client = PowerClient(timeout=5.0)

    mock_500 = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://power.larc.nasa.gov"),
    )

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_500
        with pytest.raises(UpstreamServiceError) as exc_info:
            await client.fetch_monthly_point("T2M", -3.1, -60.0, 2020, 2020)
        assert exc_info.value.status_code == 502

    await client.aclose()
