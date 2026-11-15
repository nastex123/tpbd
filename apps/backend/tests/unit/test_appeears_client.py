"""Unit tests for NASA AppEEARS client adapter."""
from unittest.mock import AsyncMock

import httpx
import pytest

from app.clients.appeears_client import AppEEARSClient
from app.core.exceptions import AppException
from app.schemas.common import Coordinates
from app.schemas.integrations import AppEEARSLoginRequest, AppEEARSTaskRequest, DateRange


def response(status_code: int, payload: dict | list) -> httpx.Response:
    return httpx.Response(status_code, json=payload, request=httpx.Request("GET", "https://appeears.test"))


def task_request() -> AppEEARSTaskRequest:
    return AppEEARSTaskRequest(
        task_name="Amazon_NDVI_Extraction",
        product_and_layer="MOD13Q1.061,_250m_16_days_NDVI",
        coordinates=Coordinates(latitude=-3.1, longitude=-60.0),
        date_range=DateRange(start_date="01-01-2020", end_date="12-31-2020"),
    )


@pytest.mark.asyncio
async def test_login_uses_earthdata_and_stores_live_token(monkeypatch):
    client = AppEEARSClient()
    post = AsyncMock(return_value=response(200, {"token": "nasa-session-token"}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)

    result = await client.login(AppEEARSLoginRequest(username="researcher", password="secret"))

    assert result.token == "nasa-session-token"
    assert result.token_type == "Bearer"
    assert client.get_auth_status().authenticated is True
    assert client.get_auth_status().username == "researcher"
    post.assert_awaited_once()
    assert post.await_args.kwargs["auth"] == ("researcher", "secret")
    assert post.await_args.kwargs["data"] == {"grant_type": "client_credentials"}


@pytest.mark.asyncio
async def test_login_rejected_by_nasa_clears_auth(monkeypatch):
    client = AppEEARSClient()
    monkeypatch.setattr(httpx.AsyncClient, "post", AsyncMock(return_value=response(401, {"error": "unauthorized"})))

    with pytest.raises(AppException) as exc_info:
        await client.login(AppEEARSLoginRequest(username="researcher", password="wrong"))

    assert exc_info.value.status_code == 401
    assert client.is_authenticated() is False


@pytest.mark.asyncio
async def test_unauthorized_task_submission_is_rejected():
    with pytest.raises(AppException) as exc_info:
        await AppEEARSClient().submit_task(task_request())
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_task_lifecycle_uses_remote_task_and_bundle(monkeypatch):
    client = AppEEARSClient(token="nasa-session-token", username="researcher")
    request = AsyncMock(side_effect=[
        response(201, {"task_id": "nasa-task-123"}),
        response(200, {"task_id": "nasa-task-123", "status": "processing", "progress": {"summary": {"percent_complete": 55}}}),
        response(200, {"task_id": "nasa-task-123", "status": "done", "progress": {"summary": {"percent_complete": 100}}}),
        response(200, {"files": [
            {"file_id": "metadata.json", "file_name": "metadata.json"},
            {"file_id": "points.csv", "file_name": "points.csv"},
        ]}),
    ])
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    submitted = await client.submit_task(task_request())
    processing = await client.get_task_status(submitted.task_id)
    completed = await client.get_task_status(submitted.task_id)

    assert submitted.task_id == "nasa-task-123"
    assert submitted.status == "pending"
    assert processing.status == "processing"
    assert processing.progress_percentage == 55
    assert processing.downloadable_csv_url is None
    assert completed.status == "done"
    assert completed.progress_percentage == 100
    assert completed.downloadable_csv_url.endswith("/bundle/nasa-task-123/points.csv")

    submitted_payload = request.await_args_list[0].kwargs["json"]
    assert submitted_payload == {
        "task_name": "Amazon_NDVI_Extraction",
        "task_type": "point",
        "params": {
            "dates": [{"startDate": "01-01-2020", "endDate": "12-31-2020"}],
            "layers": [{"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"}],
            "coordinates": [{"id": "point-1", "longitude": -60.0, "latitude": -3.1}],
        },
    }
    assert request.await_args_list[0].args[0] == "POST"
    assert request.await_args_list[0].args[1].endswith("/task")
    assert request.await_args_list[-1].args[1].endswith("/bundle/nasa-task-123")


@pytest.mark.asyncio
async def test_unknown_remote_task_is_not_reported_as_complete(monkeypatch):
    client = AppEEARSClient(token="nasa-session-token")
    monkeypatch.setattr(httpx.AsyncClient, "request", AsyncMock(return_value=response(404, {"error": "not found"})))

    with pytest.raises(AppException) as exc_info:
        await client.get_task_status("unknown-task")

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_auto_authenticate_with_credentials_uses_live_login(monkeypatch):
    client = AppEEARSClient()
    monkeypatch.setattr(httpx.AsyncClient, "post", AsyncMock(return_value=response(200, {"token": "nasa-session-token"})))

    authenticated = await client.auto_authenticate(username="researcher", password="secret")

    assert authenticated is True
    assert client.get_auth_status().username == "researcher"


@pytest.mark.asyncio
async def test_direct_configured_bearer_token_is_used_for_live_request(monkeypatch):
    client = AppEEARSClient(auto_auth=True, token="configured-nasa-token", username="researcher")
    request = AsyncMock(return_value=response(201, {"task_id": "nasa-task-456"}))
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    result = await client.submit_task(task_request())

    assert result.task_id == "nasa-task-456"
    assert request.await_args.kwargs["headers"]["Authorization"] == "Bearer configured-nasa-token"
