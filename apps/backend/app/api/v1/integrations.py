"""NASA AppEEARS asynchronous task integration and authentication endpoints."""
from typing import Annotated
from fastapi import APIRouter, Depends, status
from app.schemas.integrations import (
    AppEEARSLoginRequest,
    AppEEARSLoginResponse,
    AppEEARSAuthStatus,
    AppEEARSLogoutResponse,
    AppEEARSTaskRequest,
    AppEEARSTaskResponse,
    AppEEARSTaskStatus,
)
from app.clients.appeears_client import AppEEARSClient
from app.api.deps import get_appeears_client

router = APIRouter(prefix="/integrations/appeears", tags=["Integrations"])


@router.post(
    "/auth/login",
    response_model=AppEEARSLoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with NASA Earthdata Login",
    description="Exchanges NASA Earthdata Login credentials (HTTP Basic Auth) for a 48-hour AppEEARS session Bearer token.",
)
async def login(
    credentials: AppEEARSLoginRequest,
    client: Annotated[AppEEARSClient, Depends(get_appeears_client)],
) -> AppEEARSLoginResponse:
    """Authenticate and obtain Bearer token."""
    return await client.login(credentials)


@router.get(
    "/auth/status",
    response_model=AppEEARSAuthStatus,
    status_code=status.HTTP_200_OK,
    summary="Check AppEEARS authentication status",
    description="Checks whether the engine currently holds an active, unexpired AppEEARS session token.",
)
async def get_auth_status(
    client: Annotated[AppEEARSClient, Depends(get_appeears_client)],
) -> AppEEARSAuthStatus:
    """Return current session validity and username."""
    return client.get_auth_status()


@router.post(
    "/auth/logout",
    response_model=AppEEARSLogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="Terminate AppEEARS session and purge token",
    description="Actively purges the in-memory NASA AppEEARS session Bearer token and credentials.",
)
async def logout(
    client: Annotated[AppEEARSClient, Depends(get_appeears_client)],
) -> AppEEARSLogoutResponse:
    """Terminate active session and clear token."""
    client.logout()
    return AppEEARSLogoutResponse(
        authenticated=False,
        message="AppEEARS session successfully terminated",
    )


@router.post(
    "/tasks",
    response_model=AppEEARSTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit asynchronous extraction task to NASA AppEEARS",
    description="Submits a point-sample data extraction request to the NASA AppEEARS API.",
)
async def submit_task(
    task_req: AppEEARSTaskRequest,
    client: Annotated[AppEEARSClient, Depends(get_appeears_client)],
) -> AppEEARSTaskResponse:
    """Submit a new satellite extraction task."""
    return await client.submit_task(task_req)


@router.get(
    "/tasks/{task_id}",
    response_model=AppEEARSTaskStatus,
    status_code=status.HTTP_200_OK,
    summary="Check status of NASA AppEEARS task",
    description="Polls processing status, percent complete, and downloadable CSV bundle URL for an AppEEARS task.",
)
async def get_task_status(
    task_id: str,
    client: Annotated[AppEEARSClient, Depends(get_appeears_client)],
) -> AppEEARSTaskStatus:
    """Check task execution status."""
    return await client.get_task_status(task_id)
