"""Pytest configuration and shared fixtures."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client():
    """Session-scoped FastAPI TestClient."""
    with TestClient(app) as c:
        yield c
