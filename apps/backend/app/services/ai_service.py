"""AI service orchestrating natural language investigation and model routing."""
import json
import re
from app.clients.gemini_client import GeminiClient
from app.schemas.ai import (
    ModelListResponse,
    DetectiveQueryRequest,
    DetectiveQueryResponse,
)
from app.schemas.common import Coordinates
from app.services.catalog_service import CatalogService
from app.repositories.region_repository import RegionRepository
from app.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_INVESTIGATE_INSTRUCTION = """You are the TPBD (The Pale Blue Dot) Earth System Trend Detective Copilot for NASA Space Apps Challenge 2026.
Your role is to map user natural language questions to NASA Earth science variables, regions, and testable hypotheses.

Valid NASA parameters:
- T2M: Surface Air Temperature (2m) [°C]
- PRECTOTCORR: Precipitation Corrected [mm/month]
- RH2M: Relative Humidity (2m) [%]
- GWETROOT: Root-Zone Soil Wetness [fraction 0..1]
- EVPTRNS: Evapotranspiration [mm/month]

Curated benchmark regions:
- amazon_basin: lat=-3.4653, lon=-62.2159
- sahel_region: lat=14.5, lon=12.0
- la_guajira: lat=11.75, lon=-72.5
- western_australia: lat=-28.0, lon=121.0

Return your response strictly in valid JSON format matching this schema:
{
  "recommended_variables": ["VAR1", "VAR2"],
  "recommended_region_id": "region_id_or_null",
  "target_coordinates": {"latitude": float, "longitude": float},
  "hypothesis": "One concise sentence explaining what Earth system process to investigate."
}
Do not include any commentary or code fences outside the JSON object.
"""


class AIService:
    """Orchestrates Gemini AI capabilities with deterministic offline fallback."""

    def __init__(
        self,
        gemini_client: GeminiClient | None = None,
        catalog_service: CatalogService | None = None,
        region_repo: RegionRepository | None = None,
    ) -> None:
        self.gemini_client = gemini_client or GeminiClient()
        self.catalog_service = catalog_service or CatalogService()
        self.region_repo = region_repo or RegionRepository()

    def list_models(self) -> ModelListResponse:
        """List supported Gemini models and configuration status."""
        return ModelListResponse(
            models=self.gemini_client.list_models(),
            default_model="gemini-3.8-flash",
            active_api_key_configured=self.gemini_client.is_configured(),
        )

    async def investigate(self, request: DetectiveQueryRequest) -> DetectiveQueryResponse:
        """Formulate a scientific investigation from a natural language question."""
        resolved_model = self.gemini_client.resolve_model(request.model, task="query")

        # Check if live Gemini API is usable
        if self.gemini_client.is_configured():
            try:
                raw_response = await self.gemini_client.generate_content(
                    prompt=f"User investigation query: '{request.query}'",
                    system_instruction=SYSTEM_INVESTIGATE_INSTRUCTION,
                    model=resolved_model,
                )
                parsed = self._extract_json(raw_response)
                if parsed and "recommended_variables" in parsed:
                    coords = None
                    if parsed.get("target_coordinates"):
                        c = parsed["target_coordinates"]
                        coords = Coordinates(latitude=c.get("latitude", 0.0), longitude=c.get("longitude", 0.0))

                    return DetectiveQueryResponse(
                        query=request.query,
                        recommended_variables=parsed.get("recommended_variables", ["T2M"]),
                        recommended_region_id=parsed.get("recommended_region_id"),
                        target_coordinates=coords,
                        hypothesis=parsed.get("hypothesis", "Formulated from Earth system observation series."),
                        model_used=resolved_model,
                        is_fallback=False,
                    )
            except Exception as exc:
                logger.warning("Gemini live query failed, falling back to deterministic heuristic: %s", exc)

        # Deterministic offline heuristic
        return self._deterministic_investigate(request.query, model_used=resolved_model)

    def _deterministic_investigate(self, query: str, model_used: str) -> DetectiveQueryResponse:
        """Rule-based fallback when offline or lacking API key."""
        q = query.lower()
        variables: list[str] = []
        region_id: str | None = None
        coords: Coordinates | None = None

        # Variable heuristic
        if any(w in q for w in ["drought", "dry", "rain", "precip", "water"]):
            variables.extend(["PRECTOTCORR", "GWETROOT"])
        if any(w in q for w in ["heat", "warm", "temp", "fire", "hot"]):
            if "T2M" not in variables:
                variables.append("T2M")
        if any(w in q for w in ["humidity", "moisture", "vapor", "wet"]):
            if "RH2M" not in variables:
                variables.append("RH2M")

        if not variables:
            variables = ["T2M", "PRECTOTCORR"]

        # Geography heuristic
        if any(w in q for w in ["amazon", "brazil", "south america", "rainforest"]):
            region_id = "amazon_basin"
            coords = Coordinates(latitude=-3.4653, longitude=-62.2159)
            hypothesis = "Investigate persistent root-zone moisture deficits and drying trends across the Amazon Basin."
        elif any(w in q for w in ["sahel", "africa", "desert", "sahara"]):
            region_id = "sahel_region"
            coords = Coordinates(latitude=14.5, longitude=12.0)
            hypothesis = "Examine post-1980s precipitation recovery versus ongoing extreme temperature anomalies in the Sahel."
        elif any(w in q for w in ["guajira", "colombia", "caribbean", "arid"]):
            region_id = "la_guajira"
            coords = Coordinates(latitude=11.75, longitude=-72.5)
            hypothesis = "Detect trends in arid coastal Caribbean microclimates and seasonal water stress in La Guajira."
        elif any(w in q for w in ["australia", "perth", "bushfire", "western australia"]):
            region_id = "western_australia"
            coords = Coordinates(latitude=-28.0, longitude=121.0)
            hypothesis = "Investigate prolonged multi-year warming trends and hydrological shifts across Western Australia."
        else:
            coords = Coordinates(latitude=0.0, longitude=0.0)
            hypothesis = f"Investigate multi-decade trends and seasonal anomalies for {', '.join(variables)} based on historical observations."

        return DetectiveQueryResponse(
            query=query,
            recommended_variables=variables,
            recommended_region_id=region_id,
            target_coordinates=coords,
            hypothesis=hypothesis,
            model_used=f"{model_used} (deterministic fallback)",
            is_fallback=True,
        )

    def _extract_json(self, text: str) -> dict | None:
        """Safely extract JSON object from LLM response text."""
        # Clean markdown code block fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    return None
            return None
