"""Skill: API Runner.
Executes asynchronous HTTP requests against local FastAPI backend using ASGITransport or live socket.
Handles authentication, dynamic payloads, and accurate latency measurement.
"""
import sys
import time
from pathlib import Path
from typing import Any

# Ensure apps/backend is in sys.path
backend_root = Path(__file__).resolve().parents[2]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import httpx
from app.main import create_app


class ApiResponse:
    def __init__(
        self,
        status_code: int,
        latency_ms: float,
        headers: dict[str, str],
        data: Any,
        raw_text: str,
        url: str,
        method: str,
    ):
        self.status_code = status_code
        self.latency_ms = latency_ms
        self.headers = headers
        self.data = data
        self.raw_text = raw_text
        self.url = url
        self.method = method

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    @property
    def is_json(self) -> bool:
        return isinstance(self.data, (dict, list))


class ApiRunner:
    """Harness to execute requests against FastAPI backend."""

    def __init__(self, base_url: str = "http://127.0.0.1:8000", use_asgi: bool = True):
        self.base_url = base_url.rstrip("/")
        self.use_asgi = use_asgi
        self._app = create_app() if use_asgi else None

    async def request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        timeout: float = 30.0,
    ) -> ApiResponse:
        """Send an HTTP request and measure latency."""
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        req_headers = {"Accept": "application/json"}
        if headers:
            req_headers.update(headers)

        transport = httpx.ASGITransport(app=self._app) if self.use_asgi else None

        start_time = time.perf_counter()
        async with httpx.AsyncClient(transport=transport, timeout=timeout) as client:
            try:
                response = await client.request(
                    method=method.upper(),
                    url=url,
                    params=params,
                    json=json,
                    headers=req_headers,
                )
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                try:
                    data = response.json()
                except Exception:
                    data = response.text

                return ApiResponse(
                    status_code=response.status_code,
                    latency_ms=round(latency_ms, 2),
                    headers=dict(response.headers),
                    data=data,
                    raw_text=response.text,
                    url=url,
                    method=method.upper(),
                )
            except Exception as exc:
                latency_ms = (time.perf_counter() - start_time) * 1000.0
                return ApiResponse(
                    status_code=0,
                    latency_ms=round(latency_ms, 2),
                    headers={},
                    data={"error": str(exc)},
                    raw_text=str(exc),
                    url=url,
                    method=method.upper(),
                )

    async def get(self, path: str, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None) -> ApiResponse:
        return await self.request("GET", path, params=params, headers=headers)

    async def post(
        self,
        path: str,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> ApiResponse:
        return await self.request("POST", path, params=params, json=json, headers=headers)


if __name__ == "__main__":
    import asyncio

    async def main():
        runner = ApiRunner()
        res = await runner.get("/health")
        print(f"Health check: HTTP {res.status_code} ({res.latency_ms}ms)")
        print("Data:", res.data)

    asyncio.run(main())
