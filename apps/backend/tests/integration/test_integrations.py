"""Integration tests for NASA AppEEARS endpoints with isolated provider responses."""
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app


def json_response(status: int, payload: dict) -> httpx.Response:
    return httpx.Response(status, json=payload, request=httpx.Request("GET", "https://appeears.test"))


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_appeears_auth_flow(client, monkeypatch):
    post = AsyncMock(return_value=json_response(200, {"token": "nasa-integration-token"}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)

    initial = client.get("/api/v1/integrations/appeears/auth/status")
    login = client.post(
        "/api/v1/integrations/appeears/auth/login",
        json={"username": "researcher", "password": "secret"},
    )
    auth_status = client.get("/api/v1/integrations/appeears/auth/status")

    assert initial.status_code == 200
    assert initial.json()["authenticated"] is False
    assert login.status_code == 200
    assert login.json()["token"] == "nasa-integration-token"
    assert auth_status.status_code == 200
    assert auth_status.json()["authenticated"] is True
    assert auth_status.json()["username"] == "researcher"


def test_appeears_task_submission_and_status_are_from_nasa(client, monkeypatch):
    client.post(
        "/api/v1/integrations/appeears/auth/login",
        json={"username": "researcher", "password": "secret"},
    )
    request = AsyncMock(side_effect=[
        json_response(201, {"task_id": "nasa-task-integration"}),
        json_response(200, {"task_id": "nasa-task-integration", "status": "processing", "progress": {"summary": {"percent_complete": 30}}}),
    ])
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    task_payload = {
        "task_name": "Amazon_MODIS_NDVI",
        "product_and_layer": "MOD13Q1.061,_250m_16_days_NDVI",
        "coordinates": {"latitude": -3.1, "longitude": -60.0},
        "date_range": {"start_date": "01-01-2023", "end_date": "12-31-2023"},
    }
    submitted = client.post("/api/v1/integrations/appeears/tasks", json=task_payload)
    task_id = submitted.json()["task_id"]
    task_status = client.get(f"/api/v1/integrations/appeears/tasks/{task_id}")

    assert submitted.status_code == 202
    assert task_id == "nasa-task-integration"
    assert submitted.json()["status"] == "pending"
    assert task_status.status_code == 200
    assert task_status.json()["status"] == "processing"
    assert task_status.json()["progress_percentage"] == 30
