"""Integration tests for NASA AppEEARS authentication and tasks endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_appeears_auth_flow(client):
    """Verify login and auth status inspection via API."""
    # Check initial status
    res_init = client.get("/api/v1/integrations/appeears/auth/status")
    assert res_init.status_code == 200

    # Login
    login_payload = {
        "username": "demo_researcher",
        "password": "demo_password",
    }
    res_login = client.post("/api/v1/integrations/appeears/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "token" in login_data
    assert login_data["token_type"] == "Bearer"

    # Check status again
    res_status = client.get("/api/v1/integrations/appeears/auth/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["authenticated"] is True
    assert status_data["username"] == "demo_researcher"


def test_appeears_task_submission_and_status(client):
    """Verify submitting a task and checking its progress."""
    # Authenticate first
    client.post(
        "/api/v1/integrations/appeears/auth/login",
        json={"username": "demo_user", "password": "demo_password"},
    )

    task_payload = {
        "task_name": "Amazon_MODIS_NDVI",
        "product_and_layer": "MOD13Q1.061,_250m_16_days_NDVI",
        "coordinates": {"latitude": -3.1, "longitude": -60.0},
        "date_range": {"start_date": "01-01-2023", "end_date": "12-31-2023"},
    }

    res_submit = client.post("/api/v1/integrations/appeears/tasks", json=task_payload)
    assert res_submit.status_code == 202
    submit_data = res_submit.json()
    assert "task_id" in submit_data
    assert submit_data["status"] == "pending"

    task_id = submit_data["task_id"]

    # Poll status
    res_status = client.get(f"/api/v1/integrations/appeears/tasks/{task_id}")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["task_id"] == task_id
    assert status_data["status"] in ["processing", "done"]
    assert status_data["progress_percentage"] >= 50
