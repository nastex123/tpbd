"""Validation and normalization of future climate projections."""
import re
from app.clients.projection_client import ProjectionClient
from app.core.exceptions import AppException, NotFoundError, UpstreamServiceError
from app.schemas.catalog import DataSourceProvider
from app.schemas.projections import (
    ProjectionDataPoint,
    ProjectionModelsResponse,
    ProjectionScenarioInfo,
    ProjectionScenariosResponse,
    ProjectionSeriesResponse,
    SSPScenario,
)
from app.services.catalog_service import CatalogService


SCENARIOS = [
    ProjectionScenarioInfo(scenario=SSPScenario.SSP126, name="SSP1-2.6", description="Sustainable development, low emissions."),
    ProjectionScenarioInfo(scenario=SSPScenario.SSP245, name="SSP2-4.5", description="Middle-of-the-road, intermediate emissions."),
    ProjectionScenarioInfo(scenario=SSPScenario.SSP370, name="SSP3-7.0", description="Regional rivalry, high emissions."),
]
PROJECTION_SOURCE = "https://power.larc.nasa.gov/docs/services/api/projection/"
SUPPORTED_VARIABLES = {"T2M", "RH2M", "PRECTOTCORR"}


class ProjectionService:
    """Expose only catalogued NASA POWER variables and supported SSP scenarios."""

    def __init__(self, client: ProjectionClient | None = None, catalog: CatalogService | None = None):
        self.client = client or ProjectionClient()
        self.catalog = catalog or CatalogService()

    def list_scenarios(self) -> ProjectionScenariosResponse:
        return ProjectionScenariosResponse(scenarios=SCENARIOS)

    async def list_models(self) -> ProjectionModelsResponse:
        payload = await self.client.list_models(temporal="monthly")
        models = payload.get("models")
        if payload.get("temporal") != "monthly" or not isinstance(models, list) or not models:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Monthly model catalog was incomplete.")
        valid_models = sorted({model for model in models if isinstance(model, str) and re.fullmatch(r"[a-z0-9_]{1,40}", model)})
        if not valid_models:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Monthly model catalog contained no valid model identifiers.")
        return ProjectionModelsResponse(models=valid_models)

    async def get_monthly_series(
        self,
        variable_id: str,
        latitude: float,
        longitude: float,
        start_year: int,
        end_year: int,
        scenario: SSPScenario,
        model: str,
    ) -> ProjectionSeriesResponse:
        variable = self.catalog.get_variable_by_id(variable_id)
        if (not variable or variable.provider != DataSourceProvider.NASA_POWER
            or not variable.data_community or variable.variable_id not in SUPPORTED_VARIABLES):
            raise NotFoundError(resource="NASA POWER projection variable", identifier=variable_id)

        model_catalog = await self.list_models()
        if model not in model_catalog.models:
            raise AppException(
                title="Unsupported Projection Model", status_code=422,
                detail=f"Model '{model}' is not available in the monthly NASA POWER projection archive.",
                error_type="https://tpbd.nasa.gov/errors/unsupported-projection-model",
            )

        payload = await self.client.fetch_monthly_point(
            variable_id=variable.variable_id,
            community=variable.data_community.split()[0],
            latitude=latitude,
            longitude=longitude,
            start_year=start_year,
            end_year=end_year,
            scenario=scenario.value,
            model=model,
        )
        try:
            raw_values = payload["properties"]["parameter"][variable.variable_id][scenario.value]
            parameter_metadata = payload["parameters"][variable.variable_id]
            unit = parameter_metadata["units"]
            coordinates = payload["geometry"]["coordinates"]
            header = payload["header"]
            source_models = header["model"]
        except (KeyError, TypeError) as exc:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Projection response was missing required data or metadata.") from exc

        if not isinstance(raw_values, dict) or not isinstance(unit, str) or not unit.strip():
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Projection values or units were invalid.")
        if not isinstance(coordinates, list) or len(coordinates) < 2 or not all(isinstance(v, (int, float)) for v in coordinates[:2]):
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Projection grid coordinates were invalid.")
        if source_models != model:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Projection response model did not match the requested model.")

        points: list[ProjectionDataPoint] = []
        for date, raw_value in sorted(raw_values.items()):
            if not isinstance(date, str) or not re.fullmatch(r"\d{6}", date):
                continue
            year, month = int(date[:4]), int(date[4:])
            if year < start_year or year > end_year or not 1 <= month <= 12:
                continue
            if isinstance(raw_value, bool) or not isinstance(raw_value, (int, float)):
                continue
            missing = raw_value == -999
            points.append(ProjectionDataPoint(
                date=f"{year:04d}-{month:02d}",
                value=None if missing else float(raw_value),
                quality="missing" if missing else "projected",
            ))

        if not points:
            raise UpstreamServiceError(provider="NASA POWER Projection API", detail="Projection response contained no monthly values for this request.")
        return ProjectionSeriesResponse(
            variable_id=variable.variable_id,
            scenario=scenario,
            model=model,
            unit=unit,
            requested_coordinates={"latitude": latitude, "longitude": longitude},
            grid_coordinates={"latitude": float(coordinates[1]), "longitude": float(coordinates[0])},
            period={"start": points[0].date, "end": points[-1].date},
            points=points,
        )
