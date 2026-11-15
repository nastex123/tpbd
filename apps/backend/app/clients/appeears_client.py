"""Asynchronous client adapter for NASA AppEEARS."""
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import status

from app.core.exceptions import AppException, UpstreamServiceError
from app.core.logging import get_logger
from app.schemas.integrations import (
    AppEEARSAuthStatus,
    AppEEARSLoginRequest,
    AppEEARSLoginResponse,
    AppEEARSTaskRequest,
    AppEEARSTaskResponse,
    AppEEARSTaskStatus,
)

logger = get_logger(__name__)


class AppEEARSClient:
    """Client for NASA Earthdata authentication and AppEEARS point tasks."""

    def __init__(
        self,
        base_url: str = "https://appeears.earthdatacloud.nasa.gov/api",
        timeout: float = 15.0,
        token: str | None = None,
        username: str | None = None,
        auto_auth: bool = False,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.auto_auth = auto_auth
        self._token = token
        self._token_expiration = (
            datetime.now(timezone.utc) + timedelta(hours=48) if token else None
        )
        self._username = username if token else None

    def is_authenticated(self) -> bool:
        """Return whether an unexpired NASA session token is available."""
        return bool(
            self._token
            and self._token_expiration
            and datetime.now(timezone.utc) < self._token_expiration
        )

    def get_auth_status(self) -> AppEEARSAuthStatus:
        authenticated = self.is_authenticated()
        return AppEEARSAuthStatus(
            authenticated=authenticated,
            username=self._username if authenticated else None,
            expiration=self._token_expiration if authenticated else None,
        )

    async def auto_authenticate(
        self,
        username: str | None = None,
        password: str | None = None,
        token: str | None = None,
    ) -> bool:
        """Authenticate with a configured NASA token or Earthdata credentials."""
        if self.is_authenticated():
            return True
        if token:
            self._token = token
            self._token_expiration = datetime.now(timezone.utc) + timedelta(hours=48)
            self._username = username or "earthdata_user"
            return True
        if username and password:
            await self.login(AppEEARSLoginRequest(username=username, password=password))
            return True
        return False

    async def login(self, credentials: AppEEARSLoginRequest) -> AppEEARSLoginResponse:
        """Exchange Earthdata credentials for a live AppEEARS bearer token."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/login",
                    auth=(credentials.username, credentials.password),
                    data={"grant_type": "client_credentials"},
                )
        except httpx.RequestError as exc:
            logger.warning("Network failure communicating with AppEEARS login: %s", exc)
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="Could not reach the authentication service.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc

        if response.status_code in (401, 403):
            raise AppException(
                title="Invalid Earthdata Credentials",
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="NASA Earthdata Login rejected the provided username or password.",
                error_type="https://tpbd.nasa.gov/errors/unauthorized",
            )
        self._raise_for_upstream_status(response, "authentication")
        payload = self._read_json(response, "authentication")
        token = payload.get("token") if isinstance(payload, dict) else None
        if not isinstance(token, str) or not token.strip():
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="Authentication response did not contain a session token.",
            )

        self._token = token
        self._token_expiration = datetime.now(timezone.utc) + timedelta(hours=48)
        self._username = credentials.username
        return AppEEARSLoginResponse(
            token=token,
            token_type="Bearer",
            expiration=self._token_expiration,
        )

    async def submit_task(self, task_req: AppEEARSTaskRequest) -> AppEEARSTaskResponse:
        """Submit a real point-sampling task to NASA AppEEARS."""
        await self._ensure_authenticated()
        product_id, separator, layer_name = task_req.product_and_layer.partition(",")
        if not separator or not product_id.strip() or not layer_name.strip():
            raise AppException(
                title="Invalid AppEEARS Product Layer",
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="product_and_layer must contain a product ID and layer separated by a comma.",
                error_type="https://tpbd.nasa.gov/errors/invalid-product-layer",
            )

        payload = {
            "task_name": task_req.task_name,
            "task_type": "point",
            "params": {
                "dates": [{
                    "startDate": task_req.date_range.start_date,
                    "endDate": task_req.date_range.end_date,
                }],
                "layers": [{"product": product_id.strip(), "layer": layer_name.strip()}],
                "coordinates": [{
                    "id": "point-1",
                    "longitude": task_req.coordinates.longitude,
                    "latitude": task_req.coordinates.latitude,
                }],
            },
        }
        data = await self._request_json("POST", "/task", json=payload)
        task_id = data.get("task_id") if isinstance(data, dict) else None
        if not isinstance(task_id, str) or not task_id:
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="Task submission response did not contain a task ID.",
            )
        logger.info("Submitted AppEEARS task '%s' (ID: %s)", task_req.task_name, task_id)
        return AppEEARSTaskResponse(task_id=task_id, status="pending")

    async def get_task_status(self, task_id: str) -> AppEEARSTaskStatus:
        """Read live AppEEARS task status and the CSV bundle when it is ready."""
        await self._ensure_authenticated()
        data = await self._request_json("GET", f"/task/{task_id}")
        if not isinstance(data, dict) or not isinstance(data.get("status"), str):
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="Task status response had an invalid structure.",
            )

        remote_status = data["status"].lower()
        progress_value = data.get("progress_percentage")
        if progress_value is None:
            progress_data = data.get("progress")
            summary = progress_data.get("summary") if isinstance(progress_data, dict) else None
            progress_value = summary.get("percent_complete", 0) if isinstance(summary, dict) else 0
        try:
            progress = max(0, min(100, int(float(progress_value))))
        except (TypeError, ValueError):
            progress = 100 if remote_status == "done" else 0

        download_url = None
        if remote_status == "done":
            bundle = await self._request_json("GET", f"/bundle/{task_id}")
            files = bundle.get("files", []) if isinstance(bundle, dict) else []
            csv_file = next(
                (item for item in files
                 if isinstance(item, dict)
                 and str(item.get("file_name", "")).lower().endswith(".csv")
                 and item.get("file_id") is not None),
                None,
            )
            if csv_file:
                download_url = f"{self.base_url}/bundle/{task_id}/{csv_file['file_id']}"

        return AppEEARSTaskStatus(
            task_id=task_id,
            status=remote_status,
            progress_percentage=progress,
            downloadable_csv_url=download_url,
        )

    async def list_products(self) -> list[dict]:
        """Read the current AppEEARS product catalog without requiring login."""
        payload = await self._request_json("GET", "/product", authenticated=False)
        if not isinstance(payload, list) or not all(isinstance(item, dict) for item in payload):
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="The product catalog response had an invalid structure.",
            )
        return payload

    async def get_product_layers(self, product_id: str) -> dict:
        """Read live layer metadata for a specific AppEEARS product."""
        payload = await self._request_json(
            "GET", f"/product/{product_id}", authenticated=False
        )
        if not isinstance(payload, dict):
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="The product layer response had an invalid structure.",
            )
        return payload

    async def _ensure_authenticated(self) -> None:
        if not self.is_authenticated() and self.auto_auth:
            from app.core.config import settings

            await self.auto_authenticate(
                username=settings.EARTHDATA_USERNAME,
                password=settings.EARTHDATA_PASSWORD,
                token=settings.EARTHDATA_TOKEN,
            )
        if not self.is_authenticated():
            raise AppException(
                title="Unauthorized AppEEARS Session",
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="An active NASA Earthdata session token is required for this operation.",
                error_type="https://tpbd.nasa.gov/errors/unauthorized",
            )

    async def _request_json(
        self, method: str, path: str, *, authenticated: bool = True, **kwargs
    ) -> dict | list:
        if authenticated:
            await self._ensure_authenticated()
        headers = kwargs.pop("headers", {})
        if authenticated:
            headers["Authorization"] = f"Bearer {self._token}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method, f"{self.base_url}{path}", headers=headers, **kwargs
                )
        except httpx.RequestError as exc:
            logger.warning("Network failure communicating with AppEEARS: %s", exc)
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail="Could not reach the data service.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        self._raise_for_upstream_status(response, path)
        return self._read_json(response, path)

    @staticmethod
    def _read_json(response: httpx.Response, operation: str) -> dict | list:
        try:
            data = response.json()
        except ValueError as exc:
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail=f"The {operation} response was not valid JSON.",
            ) from exc
        if not isinstance(data, (dict, list)):
            raise UpstreamServiceError(
                provider="NASA AppEEARS",
                detail=f"The {operation} response had an invalid structure.",
            )
        return data

    @staticmethod
    def _raise_for_upstream_status(response: httpx.Response, operation: str) -> None:
        if response.status_code < 400:
            return
        code = response.status_code
        if code in (401, 403):
            raise AppException(
                title="Unauthorized AppEEARS Session",
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="NASA AppEEARS rejected the active session token.",
                error_type="https://tpbd.nasa.gov/errors/unauthorized",
            )
        if code == 404:
            raise AppException(
                title="AppEEARS Resource Not Found",
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NASA AppEEARS could not find the requested resource ({operation}).",
                error_type="https://tpbd.nasa.gov/errors/not-found",
            )
        raise UpstreamServiceError(
            provider="NASA AppEEARS",
            detail=f"The {operation} request failed (HTTP {code}).",
            status_code=status.HTTP_502_BAD_GATEWAY if code >= 500 else status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
