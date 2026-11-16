"""Integration tests for the NASA POWER CMIP6 projection endpoints."""
from unittest.mock import AsyncMock, patch
from app.clients.projection_client import ProjectionClient


def test_list_projection_scenarios(client):
    response = client.get("/api/v1/projections/scenarios")
    assert response.status_code == 200
    scenarios = response.json()["scenarios"]
    assert [item["scenario"] for item in scenarios] == ["ssp126", "ssp245", "ssp370"]
    assert all("not an exact prediction" in item["caveat"] for item in scenarios)


def test_list_projection_models_uses_live_monthly_catalog(client):
    with patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models:
        mock_models.return_value = {"temporal": "monthly", "models": ["cesm2", "ensemble"]}
        response = client.get("/api/v1/projections/models")
    assert response.status_code == 200
    assert response.json()["models"] == ["cesm2", "ensemble"]
    mock_models.assert_awaited_once_with(temporal="monthly")


def test_get_projection_series_preserves_scenario_metadata_and_missing_values(client):
    payload = {
        "properties": {"parameter": {"T2M": {"ssp245": {"205001": 1.87, "205002": -999}}}},
        "parameters": {"T2M": {"units": "C", "longname": "Temperature at 2 Meters"}},
        "geometry": {"coordinates": [-60.125, -3.125, 20]},
        "header": {"model": "ensemble"},
    }
    with (
        patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models,
        patch.object(ProjectionClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
        mock_fetch.return_value = payload
        response = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=-3&longitude=-60"
            "&start_year=2050&end_year=2050&scenario=ssp245&model=ensemble"
        )
    assert response.status_code == 200
    data = response.json()
    assert data["is_projection"] is True
    assert data["scenario"] == "ssp245"
    assert data["model"] == "ensemble"
    assert data["unit"] == "C"
    assert data["grid_coordinates"] == {"latitude": -3.125, "longitude": -60.125}
    assert data["points"] == [
        {"date": "2050-01", "value": 1.87, "quality": "projected"},
        {"date": "2050-02", "value": None, "quality": "missing"},
    ]
    mock_fetch.assert_awaited_once_with(
        variable_id="T2M", community="AG", latitude=-3.0, longitude=-60.0,
        start_year=2050, end_year=2050, scenario="ssp245", model="ensemble",
    )


def test_projection_series_rejects_historical_years_and_invalid_ssp(client):
    historical = client.get(
        "/api/v1/projections/series?variable_id=T2M&latitude=0&longitude=0&start_year=2014&scenario=ssp245"
    )
    unsupported = client.get(
        "/api/v1/projections/series?variable_id=T2M&latitude=0&longitude=0&scenario=ssp585"
    )
    assert historical.status_code == 400
    assert unsupported.status_code == 400


def test_projection_series_rejects_unavailable_model_and_unapproved_variable(client):
    with patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models:
        mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
        unsupported_model = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=0&longitude=0&scenario=ssp245&model=cesm2"
        )
        unsupported_variable = client.get(
            "/api/v1/projections/series?variable_id=MOD13Q1_NDVI&latitude=0&longitude=0&scenario=ssp245"
        )
        unsupported_projection_parameter = client.get(
            "/api/v1/projections/series?variable_id=GWETROOT&latitude=0&longitude=0&scenario=ssp245"
        )
    assert unsupported_model.status_code == 422
    assert unsupported_variable.status_code == 404
    assert unsupported_projection_parameter.status_code == 404
