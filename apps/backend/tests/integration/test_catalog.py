"""Tests for catalog variables and satellite products endpoints."""
from unittest.mock import AsyncMock

import httpx


def provider_response(payload):
    return httpx.Response(200, json=payload, request=httpx.Request("GET", "https://appeears.test"))


def test_list_variables_returns_all(client):
    """Verify listing all curated variables."""
    response = client.get("/api/v1/catalog/variables")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 7

    ids = [v["variable_id"] for v in data]
    assert "T2M" in ids
    assert "PRECTOTCORR" in ids
    assert "GWETROOT" in ids
    assert "MOD13Q1_NDVI" in ids
    assert "NCEI_TAVG" in ids


def test_filter_variables_by_category(client):
    """Verify filtering by atmosphere category."""
    response = client.get("/api/v1/catalog/variables?category=atmosphere")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    assert all(v["category"] == "atmosphere" for v in data)


def test_filter_variables_by_provider(client):
    """Verify filtering by NASA_APPEEARS provider."""
    response = client.get("/api/v1/catalog/variables?provider=NASA_APPEEARS")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
    assert all(v["provider"] == "NASA_APPEEARS" for v in data)


def test_get_variable_by_id_success(client):
    """Verify retrieving specific variable metadata."""
    response = client.get("/api/v1/catalog/variables/T2M")
    assert response.status_code == 200
    data = response.json()
    assert data["variable_id"] == "T2M"
    assert data["unit"] == "°C"
    assert data["category"] == "atmosphere"
    assert "MERRA-2" in data["source_model_or_sensor"]


def test_get_variable_by_id_not_found(client):
    """Verify 404 RFC 7807 response for unknown variable."""
    response = client.get("/api/v1/catalog/variables/UNKNOWN_VAR")
    assert response.status_code == 404
    assert response.headers.get("content-type") == "application/problem+json"
    data = response.json()
    assert data["status"] == 404
    assert data["title"] == "Resource Not Found"
    assert "UNKNOWN_VAR" in data["detail"]


def test_list_satellite_products_uses_live_catalog(client, monkeypatch):
    """Verify only products returned as currently available by AppEEARS are listed."""
    products = [
        {"ProductAndVersion": "MOD13Q1.061", "Platform": "Terra MODIS", "Description": "Vegetation indices", "Resolution": "250m", "TemporalGranularity": "16 day", "Available": True, "Deleted": False},
        {"ProductAndVersion": "MOD11A1.061", "Platform": "Terra MODIS", "Description": "Land surface temperature", "Resolution": "1000m", "TemporalGranularity": "Daily", "Available": True, "Deleted": False},
        {"ProductAndVersion": "OLD.001", "Platform": "SMAP", "Description": "Archived", "Resolution": "9km", "TemporalGranularity": "Daily", "Available": False, "Deleted": False},
    ]
    request = AsyncMock(return_value=provider_response(products))
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    response = client.get("/api/v1/catalog/products")
    assert response.status_code == 200
    data = response.json()
    product_ids = [p["product_id"] for p in data]
    assert "MOD13Q1.061" in product_ids
    assert "MOD11A1.061" in product_ids
    assert "OLD.001" not in product_ids
    assert data[0]["available_layers"] is None
    assert request.await_args.kwargs["headers"] == {}


def test_get_satellite_product_includes_live_available_layers(client, monkeypatch):
    request = AsyncMock(side_effect=[
        provider_response([
            {"ProductAndVersion": "MOD13Q1.061", "Platform": "Terra MODIS", "Description": "Vegetation indices", "Resolution": "250m", "TemporalGranularity": "16 day", "Available": True, "Deleted": False},
        ]),
        provider_response({
            "_250m_16_days_NDVI": {"Available": True},
            "_250m_16_days_EVI": {"Available": True},
            "obsolete_layer": {"Available": False},
        }),
    ])
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    response = client.get("/api/v1/catalog/products/MOD13Q1.061")

    assert response.status_code == 200
    assert response.json()["product_id"] == "MOD13Q1.061"
    assert response.json()["available_layers"] == ["_250m_16_days_EVI", "_250m_16_days_NDVI"]


def test_get_unknown_satellite_product_returns_not_found(client, monkeypatch):
    request = AsyncMock(return_value=provider_response([]))
    monkeypatch.setattr(httpx.AsyncClient, "request", request)

    response = client.get("/api/v1/catalog/products/UNKNOWN.001")

    assert response.status_code == 404
