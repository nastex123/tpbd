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
            "/api/v1/projections/series?variable_id=NONEXISTENT_VAR&latitude=0&longitude=0&scenario=ssp245"
        )
        unsupported_projection_parameter = client.get(
            "/api/v1/projections/series?variable_id=INVALID_METRIC&latitude=0&longitude=0&scenario=ssp245"
        )
    assert unsupported_model.status_code == 422
    assert unsupported_variable.status_code == 404
    assert unsupported_projection_parameter.status_code == 404


def test_projection_series_supports_ndvi_soil_moisture_and_evapotranspiration(client):
    for var in ["MOD13Q1_NDVI", "GWETROOT", "EVPTRNS"]:
        response = client.get(
            f"/api/v1/projections/series?variable_id={var}&latitude=37.4&longitude=-5.9&start_year=2026&end_year=2030&scenario=ssp245"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["variable_id"] == var
        assert len(data["points"]) == 60
        assert all(p["quality"] == "projected" for p in data["points"])


def test_projection_series_applies_ipcc_ar6_fallback_when_all_points_missing(client):
    payload = {
        "properties": {"parameter": {"T2M": {"ssp245": {"205001": -999, "205002": -999}}}},
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
            "/api/v1/projections/series?variable_id=T2M&latitude=-3.1&longitude=-60.0"
            "&start_year=2050&end_year=2050&scenario=ssp245&model=ensemble"
        )
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "NASA POWER MERRA-2 Climatology / IPCC AR6 CMIP6 Scenario Model"
    assert "IPCC AR6 CMIP6 scenario pathways" in data["caveat"]
    assert len(data["points"]) == 2
    assert all(p["quality"] == "projected" for p in data["points"])
    assert all(p["value"] is not None for p in data["points"])
    assert 20.0 < data["points"][0]["value"] < 35.0


def test_projection_physical_seasonal_warming_asymmetry_in_mediterranean(client):
    """Verify IPCC AR6 summer warming amplification over winter in Mediterranean mid-latitudes."""
    # Build a 12-month fill-value payload for year 2090 in Seville (lat 37.4, lon -5.9)
    months = [f"2090{m:02d}" for m in range(1, 13)]
    payload = {
        "properties": {"parameter": {"T2M": {"ssp245": {m: -999 for m in months}}}},
        "parameters": {"T2M": {"units": "C", "longname": "Temperature at 2 Meters"}},
        "geometry": {"coordinates": [-5.9, 37.4, 20]},
        "header": {"model": "ensemble"},
    }
    with (
        patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models,
        patch.object(ProjectionClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
        mock_fetch.return_value = payload
        response = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=37.4&longitude=-5.9"
            "&start_year=2090&end_year=2090&scenario=ssp245&model=ensemble"
        )
    assert response.status_code == 200
    points = response.json()["points"]
    # Curated baseline for Seville: Jan (m=1) is 11.0°C, Jul (m=7) is 29.5°C
    jan_val = next(p["value"] for p in points if p["date"] == "2090-01")
    jul_val = next(p["value"] for p in points if p["date"] == "2090-07")
    jan_warming = jan_val - 11.0
    jul_warming = jul_val - 29.5
    # Summer warming must exceed winter warming due to soil moisture drying feedback
    assert jul_warming > jan_warming
    assert jul_warming > 2.0


def test_projection_interannual_variability_not_static_barcode(client):
    """Verify that multi-year projections display natural atmospheric variance instead of static barcode."""
    years = list(range(2030, 2041))
    jul_keys = [f"{y}07" for y in years]
    payload = {
        "properties": {"parameter": {"T2M": {"ssp245": {k: -999 for k in jul_keys}}}},
        "parameters": {"T2M": {"units": "C", "longname": "Temperature at 2 Meters"}},
        "geometry": {"coordinates": [-5.9, 37.4, 20]},
        "header": {"model": "ensemble"},
    }
    with (
        patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models,
        patch.object(ProjectionClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
        mock_fetch.return_value = payload
        response = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=37.4&longitude=-5.9"
            "&start_year=2030&end_year=2040&scenario=ssp245&model=ensemble"
        )
    assert response.status_code == 200
    points = response.json()["points"]
    values = [p["value"] for p in points]
    diffs = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    # Consecutive year-to-year deltas must NOT be identical (not a linear monotonic barcode)
    unique_diffs = set(round(d, 2) for d in diffs)
    assert len(unique_diffs) > 3
    # Check that fluctuations include both positive and negative year-over-year steps
    assert any(d > 0 for d in diffs)
    assert any(d < 0 for d in diffs)


def test_projection_determinism_and_reproducibility(client):
    """Verify that identical queries return bit-for-bit identical projection values without random jitter."""
    payload = {
        "properties": {"parameter": {"T2M": {"ssp245": {"205006": -999, "205007": -999}}}},
        "parameters": {"T2M": {"units": "C", "longname": "Temperature at 2 Meters"}},
        "geometry": {"coordinates": [-5.9, 37.4, 20]},
        "header": {"model": "ensemble"},
    }
    with (
        patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models,
        patch.object(ProjectionClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch,
    ):
        mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
        mock_fetch.return_value = payload
        res1 = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=37.4&longitude=-5.9"
            "&start_year=2050&end_year=2050&scenario=ssp245&model=ensemble"
        )
        res2 = client.get(
            "/api/v1/projections/series?variable_id=T2M&latitude=37.4&longitude=-5.9"
            "&start_year=2050&end_year=2050&scenario=ssp245&model=ensemble"
        )
    assert res1.json()["points"] == res2.json()["points"]


def test_projection_long_term_warming_scenario_hierarchy(client):
    """Verify that long-term warming respects IPCC AR6 hierarchy: SSP3-7.0 > SSP2-4.5 > SSP1-2.6."""
    results = {}
    for scn in ["ssp126", "ssp245", "ssp370"]:
        payload = {
            "properties": {"parameter": {"T2M": {scn: {"210007": -999}}}},
            "parameters": {"T2M": {"units": "C", "longname": "Temperature at 2 Meters"}},
            "geometry": {"coordinates": [-5.9, 37.4, 20]},
            "header": {"model": "ensemble"},
        }
        with (
            patch.object(ProjectionClient, "list_models", new_callable=AsyncMock) as mock_models,
            patch.object(ProjectionClient, "fetch_monthly_point", new_callable=AsyncMock) as mock_fetch,
        ):
            mock_models.return_value = {"temporal": "monthly", "models": ["ensemble"]}
            mock_fetch.return_value = payload
            resp = client.get(
                f"/api/v1/projections/series?variable_id=T2M&latitude=37.4&longitude=-5.9"
                f"&start_year=2100&end_year=2100&scenario={scn}&model=ensemble"
            )
            assert resp.status_code == 200
            results[scn] = resp.json()["points"][0]["value"]

    # End of century warming under SSP3-7.0 must be significantly greater than SSP2-4.5, which is greater than SSP1-2.6
    assert results["ssp370"] > results["ssp245"] > results["ssp126"]
    assert results["ssp370"] - results["ssp126"] > 2.0

