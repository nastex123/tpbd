"""AI service orchestrating Gemini capabilities and model routing."""
import json
import re

from fastapi import status

from app.clients.gemini_client import GeminiClient
from app.core.exceptions import AppException
from app.schemas.ai import (
    AudioBriefRequest,
    AudioBriefResponse,
    DetectiveQueryRequest,
    DetectiveQueryResponse,
    ModelListResponse,
    TrendExplanationRequest,
    TrendExplanationResponse,
)
from app.schemas.common import Coordinates

SYSTEM_INVESTIGATE_INSTRUCTION = """You are the TPBD Earth System Trend Detective Copilot.
Map the user's question to NASA Earth science variables, a region if the request identifies one,
coordinates when appropriate, and a testable scientific hypothesis.

Valid NASA POWER parameters: T2M, PRECTOTCORR, RH2M, GWETROOT, EVPTRNS.
Return only valid JSON matching this schema:
{
  "recommended_variables": ["VAR1"],
  "recommended_region_id": "region_id_or_null",
  "target_coordinates": {"latitude": 0.0, "longitude": 0.0},
  "hypothesis": "One concise, testable sentence."
}
Use null for unknown region or coordinates. Do not invent a region when the user has not named one.
Do not include commentary or code fences outside the JSON object."""

SYSTEM_EXPLAIN_INSTRUCTION = """You are an Earth system scientist.
Explain the provided computed climate trend. Distinguish observation from causal attribution and
state uncertainty. Do not claim a physical driver is established by a trend alone.
Return only valid JSON:
{
  "executive_summary": "Concise 1-2 sentence finding.",
  "mechanisms_and_drivers": "Evidence-grounded possible physical context, clearly framed as hypotheses.",
  "scientific_uncertainty": "Observational limitations and uncertainty.",
  "recommended_next_steps": ["Step 1", "Step 2"]
}
Do not include commentary or code fences outside the JSON object."""


class AIService:
    """Orchestrates live Gemini requests; provider failures are returned to callers."""

    def __init__(self, gemini_client: GeminiClient | None = None) -> None:
        self.gemini_client = gemini_client or GeminiClient()

    async def list_models(self) -> ModelListResponse:
        """Return the live model catalog when configured, otherwise an empty catalog."""
        configured = self.gemini_client.is_configured()
        models = await self.gemini_client.list_models() if configured else []
        return ModelListResponse(
            models=models,
            default_model="gemini-3.8-flash",
            active_api_key_configured=configured,
        )

    async def investigate(self, request: DetectiveQueryRequest) -> DetectiveQueryResponse:
        """Generate an investigation plan from the live Gemini API."""
        model = self.gemini_client.resolve_model(request.model, task="query")
        raw_response = await self.gemini_client.generate_content(
            prompt=f"User investigation query: {request.query}",
            system_instruction=SYSTEM_INVESTIGATE_INSTRUCTION,
            model=model,
        )
        parsed = self._extract_json(raw_response)
        variables = parsed.get("recommended_variables") if parsed else None
        hypothesis = parsed.get("hypothesis") if parsed else None
        if (
            not isinstance(variables, list)
            or not variables
            or not all(isinstance(value, str) and value for value in variables)
            or not isinstance(hypothesis, str)
            or not hypothesis.strip()
        ):
            raise self._invalid_model_response("investigation")

        region_id = parsed.get("recommended_region_id")
        if region_id is not None and not isinstance(region_id, str):
            raise self._invalid_model_response("investigation")
        coordinates = None
        raw_coordinates = parsed.get("target_coordinates")
        if raw_coordinates is not None:
            if not isinstance(raw_coordinates, dict):
                raise self._invalid_model_response("investigation")
            try:
                coordinates = Coordinates(
                    latitude=raw_coordinates["latitude"],
                    longitude=raw_coordinates["longitude"],
                )
            except (KeyError, TypeError, ValueError):
                raise self._invalid_model_response("investigation") from None

        return DetectiveQueryResponse(
            query=request.query,
            recommended_variables=variables,
            recommended_region_id=region_id,
            target_coordinates=coordinates,
            hypothesis=hypothesis.strip(),
            model_used=model,
        )

    async def explain_trend(self, request: TrendExplanationRequest) -> TrendExplanationResponse:
        """Generate a scientific explanation from the computed trend and live Gemini."""
        model = self.gemini_client.resolve_model(request.model, task="thinking")
        prompt = (
            f"Variable: {request.variable_id}\n"
            f"Location: {request.location_name}\n"
            f"Direction: {request.direction}\n"
            f"Rate: {request.rate_per_decade:+.2f} {request.rate_unit}\n"
            f"P-value: {request.p_value:.4f}\n"
            f"Change Point Date: {request.change_point_date or 'None'}\n"
            f"Regime Shift: {request.regime_shift_type or 'None'}\n"
        )
        raw_response = await self.gemini_client.generate_content(
            prompt=prompt,
            system_instruction=SYSTEM_EXPLAIN_INSTRUCTION,
            model=model,
        )
        parsed = self._extract_json(raw_response)
        summary = parsed.get("executive_summary") if parsed else None
        mechanisms = parsed.get("mechanisms_and_drivers") if parsed else None
        uncertainty = parsed.get("scientific_uncertainty") if parsed else None
        next_steps = parsed.get("recommended_next_steps") if parsed else None
        if (
            not all(isinstance(value, str) and value.strip()
                    for value in (summary, mechanisms, uncertainty))
            or not isinstance(next_steps, list)
            or not next_steps
            or not all(isinstance(step, str) and step.strip() for step in next_steps)
        ):
            raise self._invalid_model_response("trend explanation")
        return TrendExplanationResponse(
            variable_id=request.variable_id,
            location_name=request.location_name,
            executive_summary=summary.strip(),
            mechanisms_and_drivers=mechanisms.strip(),
            scientific_uncertainty=uncertainty.strip(),
            recommended_next_steps=[step.strip() for step in next_steps],
            model_used=model,
        )

    async def generate_audio_brief(self, request: AudioBriefRequest) -> AudioBriefResponse:
        """Generate audio speech using Gemini TTS; no synthetic audio is substituted."""
        model = self.gemini_client.resolve_model(request.model, task="tts")
        audio_base64, mime_type = await self.gemini_client.generate_audio_tts(
            text=request.text,
            voice_name=request.voice,
            model=model,
        )
        return AudioBriefResponse(
            audio_base64=audio_base64,
            mime_type=mime_type,
            voice_used=request.voice,
            model_used=model,
        )

    @staticmethod
    def _invalid_model_response(operation: str) -> AppException:
        return AppException(
            title="Invalid Gemini Response",
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini returned a response that did not match the required {operation} format.",
            error_type="https://tpbd.nasa.gov/errors/gemini-invalid-response",
        )

    @staticmethod
    def _extract_json(text: str) -> dict | None:
        """Extract a JSON object from Gemini output without supplying default values."""
        cleaned = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
        try:
            parsed = json.loads(cleaned)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if not match:
                return None
            try:
                parsed = json.loads(match.group(0))
                return parsed if isinstance(parsed, dict) else None
            except json.JSONDecodeError:
                return None
