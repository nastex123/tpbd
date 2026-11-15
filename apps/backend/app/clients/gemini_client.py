"""Asynchronous client adapter for Google Gemini API."""
from typing import Any

import httpx
from fastapi import status

from app.core.config import settings
from app.core.exceptions import AppException, UpstreamServiceError
from app.core.logging import get_logger
from app.schemas.ai import AIModelInfo, ModelCapability

logger = get_logger(__name__)


class GeminiClient:
    """Client for Google's live Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout: float = 30.0,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_configured(self) -> bool:
        """Check if a Gemini API key is configured."""
        return bool(self.api_key and self.api_key.strip())

    async def list_models(self) -> list[AIModelInfo]:
        """Fetch every model that supports generateContent from Google's API."""
        self._require_api_key()
        models: list[AIModelInfo] = []
        page_token: str | None = None
        seen_tokens: set[str] = set()

        while True:
            params: dict[str, str | int] = {"pageSize": 1000}
            if page_token:
                params["pageToken"] = page_token
            payload = await self._get_json("/models", params=params)
            entries = payload.get("models", [])
            if not isinstance(entries, list):
                raise UpstreamServiceError(
                    provider="Google Gemini API",
                    detail="The model catalog response had an invalid structure.",
                )
            for item in entries:
                if not isinstance(item, dict):
                    continue
                methods = item.get("supportedGenerationMethods", [])
                if not isinstance(methods, list) or "generateContent" not in methods:
                    continue
                model_id = item.get("name")
                if not isinstance(model_id, str) or not model_id:
                    continue
                model_id = model_id.removeprefix("models/")
                capabilities = [ModelCapability.TEXT]
                if "thinking" in item and item["thinking"]:
                    capabilities.append(ModelCapability.THINKING)
                if "tts" in model_id.lower() or "generateAudio" in methods:
                    capabilities.append(ModelCapability.TTS)
                context_window = item.get("inputTokenLimit")
                models.append(AIModelInfo(
                    model_id=model_id,
                    display_name=item.get("displayName") or model_id,
                    capabilities=capabilities,
                    recommended_use=item.get("description") or "",
                    context_window=context_window if isinstance(context_window, int) else None,
                ))

            next_token = payload.get("nextPageToken")
            if not isinstance(next_token, str) or not next_token:
                break
            if next_token in seen_tokens:
                raise UpstreamServiceError(
                    provider="Google Gemini API",
                    detail="The model catalog returned a repeated page token.",
                )
            seen_tokens.add(next_token)
            page_token = next_token

        return models

    def resolve_model(self, requested_model: str, task: str = "query") -> str:
        """Resolve automatic routing to documented live model identifiers."""
        if requested_model != "auto":
            return requested_model
        if task == "tts":
            return "gemini-3.8-flash-tts"
        if task == "vision":
            return "gemini-3-pro-image"
        return "gemini-3.8-flash"

    async def generate_content(
        self,
        prompt: str,
        system_instruction: str,
        model: str = "gemini-3.8-flash",
    ) -> str:
        """Generate text using Gemini's generateContent endpoint."""
        self._require_api_key()
        resolved_model = self.resolve_model(model, task="query")
        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {"temperature": 0.2, "topP": 0.95},
        }
        response = await self._post_json(
            f"/models/{resolved_model}:generateContent", json=payload
        )
        candidates = response.get("candidates", [])
        if isinstance(candidates, list):
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue
                content = candidate.get("content")
                parts = content.get("parts", []) if isinstance(content, dict) else []
                for part in parts:
                    if isinstance(part, dict) and isinstance(part.get("text"), str):
                        return part["text"]
        raise UpstreamServiceError(
            provider="Google Gemini API",
            detail="The model response did not contain generated text.",
        )

    async def generate_audio_tts(
        self,
        text: str,
        voice_name: str = "Puck",
        model: str = "gemini-3.8-flash-tts",
    ) -> tuple[str, str]:
        """Generate audio with Gemini TTS and return its base64 data and real MIME type."""
        self._require_api_key()
        resolved_model = self.resolve_model(model, task="tts")
        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": voice_name}
                    }
                },
            },
        }
        response = await self._post_json(
            f"/models/{resolved_model}:generateContent", json=payload
        )
        candidates = response.get("candidates", [])
        if isinstance(candidates, list):
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue
                content = candidate.get("content")
                parts = content.get("parts", []) if isinstance(content, dict) else []
                for part in parts:
                    inline_data = part.get("inlineData") if isinstance(part, dict) else None
                    audio = inline_data.get("data") if isinstance(inline_data, dict) else None
                    mime_type = inline_data.get("mimeType") if isinstance(inline_data, dict) else None
                    if isinstance(audio, str) and audio and isinstance(mime_type, str):
                        return audio, mime_type
        raise UpstreamServiceError(
            provider="Google Gemini API",
            detail="The model response did not contain generated audio.",
        )

    def _require_api_key(self) -> None:
        if not self.is_configured():
            raise AppException(
                title="Missing Gemini API Key",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY is not configured in environment or .env file.",
                error_type="https://tpbd.nasa.gov/errors/missing-api-key",
            )

    async def _get_json(self, path: str, params: dict[str, str | int]) -> dict:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}{path}",
                    headers={"x-goog-api-key": self.api_key or ""},
                    params=params,
                )
        except httpx.TimeoutException as exc:
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="The model catalog request timed out.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Network failure connecting to Google Gemini API: %s", exc)
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="Could not reach the model catalog service.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        return self._parse_response(response)

    async def _post_json(self, path: str, json: dict[str, Any]) -> dict:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}{path}",
                    headers={"x-goog-api-key": self.api_key or ""},
                    json=json,
                )
        except httpx.TimeoutException as exc:
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="The generation request timed out.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        except httpx.RequestError as exc:
            logger.warning("Network failure connecting to Google Gemini API: %s", exc)
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="Could not reach the generation service.",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            ) from exc
        return self._parse_response(response)

    @staticmethod
    def _parse_response(response: httpx.Response) -> dict:
        if response.status_code in (401, 403):
            raise AppException(
                title="Invalid Gemini API Key",
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google AI Studio rejected the configured GEMINI_API_KEY.",
                error_type="https://tpbd.nasa.gov/errors/unauthorized",
            )
        if response.status_code >= 400:
            try:
                error = response.json().get("error", {})
                detail = error.get("message") if isinstance(error, dict) else None
            except ValueError:
                detail = None
            detail = detail if isinstance(detail, str) else f"HTTP {response.status_code}"
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail=f"Request failed: {detail[:200]}",
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        try:
            payload = response.json()
        except ValueError as exc:
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="The provider response was not valid JSON.",
            ) from exc
        if not isinstance(payload, dict):
            raise UpstreamServiceError(
                provider="Google Gemini API",
                detail="The provider response had an invalid structure.",
            )
        return payload
