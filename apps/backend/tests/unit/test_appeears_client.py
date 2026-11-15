"""Unit tests for NASA AppEEARS client adapter."""
import pytest
from app.clients.appeears_client import AppEEARSClient
from app.schemas.integrations import AppEEARSLoginRequest, AppEEARSTaskRequest, DateRange
from app.schemas.common import Coordinates
from app.core.exceptions import AppException


@pytest.mark.asyncio
async def test_appeears_login_and_auth_status():
    """Verify login provides session token and status reports authenticated."""
    client = AppEEARSClient()
    assert client.is_authenticated() is False
    assert client.get_auth_status().authenticated is False

    creds = AppEEARSLoginRequest(username="demo_user", password="demo_password")
    res = await client.login(creds)

    assert res.token.startswith("demo_token_")
    assert res.token_type == "Bearer"
    assert client.is_authenticated() is True

    status = client.get_auth_status()
    assert status.authenticated is True
    assert status.username == "demo_user"
    assert status.expiration is not None


@pytest.mark.asyncio
async def test_appeears_unauthorized_task_submission():
    """Verify unauthenticated task submission raises 401 Unauthorized."""
    client = AppEEARSClient()
    task_req = AppEEARSTaskRequest(
        task_name="Amazon_NDVI_Test",
        product_and_layer="MOD13Q1.061,_250m_16_days_NDVI",
        coordinates=Coordinates(latitude=-3.1, longitude=-60.0),
        date_range=DateRange(start_date="01-01-2020", end_date="12-31-2020"),
    )

    with pytest.raises(AppException) as exc_info:
        await client.submit_task(task_req)
    assert exc_info.value.status_code == 401
    assert "Unauthorized" in exc_info.value.title


@pytest.mark.asyncio
async def test_appeears_task_lifecycle():
    """Verify task submission and progression to completion."""
    client = AppEEARSClient()
    await client.login(AppEEARSLoginRequest(username="demo_analyst", password="demo_pass_secure"))

    task_req = AppEEARSTaskRequest(
        task_name="Amazon_NDVI_Extraction",
        product_and_layer="MOD13Q1.061,_250m_16_days_NDVI",
        coordinates=Coordinates(latitude=-3.1, longitude=-60.0),
        date_range=DateRange(start_date="01-01-2020", end_date="12-31-2020"),
    )

    task_res = await client.submit_task(task_req)
    assert task_res.status == "pending"
    assert task_res.task_id is not None

    # Check status advances
    status_res = await client.get_task_status(task_res.task_id)
    assert status_res.task_id == task_res.task_id
    assert status_res.status == "done"
    assert status_res.progress_percentage == 100
    assert status_res.downloadable_csv_url is not None
    assert "download.csv" in status_res.downloadable_csv_url


@pytest.mark.asyncio
async def test_appeears_auto_authenticate_direct_token():
    """Verify auto-authenticating with a direct Bearer token."""
    client = AppEEARSClient(token="mock_bearer_token_12345", username="custom_researcher")
    assert client.is_authenticated() is True
    status = client.get_auth_status()
    assert status.authenticated is True
    assert status.username == "custom_researcher"


@pytest.mark.asyncio
async def test_appeears_auto_authenticate_with_credentials():
    """Verify auto_authenticate method logs in with username and password."""
    client = AppEEARSClient()
    assert client.is_authenticated() is False
    success = await client.auto_authenticate(username="demo_user", password="demo_password")
    assert success is True
    assert client.is_authenticated() is True
    assert client.get_auth_status().username == "demo_user"


@pytest.mark.asyncio
async def test_appeears_lazy_auto_auth_on_task_submission():
    """Verify auto_auth=True lazily authenticates client upon task submission."""
    # Initialize with mock token and auto_auth enabled
    client = AppEEARSClient(auto_auth=True, token="lazy_token_abc")
    task_req = AppEEARSTaskRequest(
        task_name="Lazy_Auth_Test",
        product_and_layer="MOD13Q1.061,_250m_16_days_NDVI",
        coordinates=Coordinates(latitude=-3.1, longitude=-60.0),
        date_range=DateRange(start_date="01-01-2020", end_date="12-31-2020"),
    )
    res = await client.submit_task(task_req)
    assert res.status == "pending"
    assert res.task_id is not None
