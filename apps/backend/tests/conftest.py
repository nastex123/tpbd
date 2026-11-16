"""Pytest configuration and shared fixtures."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_cache_repository
from app.repositories.cache_repository import CacheRepository


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path):
    """Ensure every test runs with a fresh, isolated SQLite cache."""
    test_db = tmp_path / "test_isolated.db"
    repo = CacheRepository(db_path=str(test_db))
    app.dependency_overrides[get_cache_repository] = lambda: repo
    yield repo
    app.dependency_overrides.pop(get_cache_repository, None)


@pytest.fixture
def client():
    """FastAPI TestClient with isolated dependency overrides."""
    with TestClient(app) as c:
        yield c
