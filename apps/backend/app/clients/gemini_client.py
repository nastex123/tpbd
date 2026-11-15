"""Asynchronous client adapter for Google Gemini AI Studio API."""
from typing import Any
import httpx
from app.schemas.ai import AIModelInfo, ModelCapability
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import get_logger
from fastapi import status

logger = get_logger(__name__)

GEMINI_MODEL_ROSTER: list[AIModelInfo] = [
    AIModelInfo(
        model_id="gemini-3.8-flash",
        display_name="Gemini 3.8 Flash",
        capabilities=[ModelCapability.TEXT, ModelCapability.VISION],
        recommended_use="Default ultra-fast model for query parsing, variable search, and hypothesis formulation.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.8-live",
        display_name="Gemini 3.8 Live",
        capabilities=[ModelCapability.TEXT, ModelCapability.AUDIO_IN],
        recommended_use="Real-time interactive conversational stream.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.8-live-extended-thinking",
        display_name="Gemini 3.8 Live Extended Thinking",
        capabilities=[ModelCapability.TEXT, ModelCapability.THINKING],
        recommended_use="Deep multidisciplinary scientific reasoning and teleconnection analysis.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.8-flash-tts",
        display_name="Gemini 3.8 Flash TTS",
        capabilities=[ModelCapability.TEXT, ModelCapability.TTS],
        recommended_use="Mission Control spoken audio synthesis and debriefs.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.8-flash-lite-tts",
        display_name="Gemini 3.8 Flash-Lite TTS",
        capabilities=[ModelCapability.TEXT, ModelCapability.TTS],
        recommended_use="Low-latency lightweight audio debrief synthesis.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.6-flash",
        display_name="Gemini 3.6 Flash",
        capabilities=[ModelCapability.TEXT, ModelCapability.VISION],
        recommended_use="Balanced high-throughput scientific analysis.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.5-flash-lite",
        display_name="Gemini 3.5 Flash-Lite",
        capabilities=[ModelCapability.TEXT],
        recommended_use="Resource-constrained lightweight text copilot.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.1-flash-lite",
        display_name="Gemini 3.1 Flash-Lite",
        capabilities=[ModelCapability.TEXT],
        recommended_use="Legacy lightweight text assistant.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-nano-banana-2.1",
        display_name="Nano Banana 2.1",
        capabilities=[ModelCapability.TEXT],
        recommended_use="Compact on-device prototype generation.",
        context_window=128000,
    ),
    AIModelInfo(
        model_id="gemini-3.1-flash-image",
        display_name="Nano Banana 2 (Flash Image)",
        capabilities=[ModelCapability.VISION, ModelCapability.TEXT],
        recommended_use="Rapid spatial map and satellite image understanding.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.1-flash-lite-image",
        display_name="Nano Banana 2 Lite",
        capabilities=[ModelCapability.VISION, ModelCapability.TEXT],
        recommended_use="Low-footprint chart critique and inspection.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3-pro-image",
        display_name="Nano Banana Pro (Pro Image)",
        capabilities=[ModelCapability.VISION, ModelCapability.TEXT, ModelCapability.THINKING],
        recommended_use="High-resolution multispectral satellite feature inspection.",
        context_window=2097152,
    ),
    AIModelInfo(
        model_id="gemini-3.5-transcribe",
        display_name="Gemini 3.5 Transcribe",
        capabilities=[ModelCapability.AUDIO_IN, ModelCapability.TEXT],
        recommended_use="Scientific voice note transcription.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-omni-1.2-flash",
        display_name="Gemini Omni 1.2 Flash",
        capabilities=[ModelCapability.TEXT, ModelCapability.VISION, ModelCapability.AUDIO_IN],
        recommended_use="Omni-channel multimodal coordination.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.1-pro-preview",
        display_name="Gemini 3.1 Pro Preview",
        capabilities=[ModelCapability.TEXT, ModelCapability.THINKING],
        recommended_use="Advanced statistical theory and code execution critique.",
        context_window=2097152,
    ),
    AIModelInfo(
        model_id="gemini-3-flash-preview",
        display_name="Gemini 3 Flash Preview",
        capabilities=[ModelCapability.TEXT],
        recommended_use="General-purpose flash preview model.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.5-live-translate-preview",
        display_name="Gemini 3.5 Live Translate Preview",
        capabilities=[ModelCapability.TEXT, ModelCapability.AUDIO_IN],
        recommended_use="Cross-language scientific terminology translation.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.1-flash-live-preview",
        display_name="Gemini 3.1 Flash Live Preview",
        capabilities=[ModelCapability.TEXT, ModelCapability.AUDIO_IN],
        recommended_use="Low-latency live stream interaction.",
        context_window=1048576,
    ),
    AIModelInfo(
        model_id="gemini-3.1-flash-tts-preview",
        display_name="Gemini 3.1 Flash TTS Preview",
        capabilities=[ModelCapability.TEXT, ModelCapability.TTS],
        recommended_use="Experimental speech synthesis preview.",
        context_window=1048576,
    ),
]


class GeminiClient:
    """Client for Google AI Studio Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout: float = 15.0,
    ) -> None:
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def is_configured(self) -> bool:
        """Check if client has an active API key."""
        return bool(self.api_key and len(self.api_key.strip()) > 0)

    def list_models(self) -> list[AIModelInfo]:
        """Return the roster of supported Gemini models."""
        return GEMINI_MODEL_ROSTER

    def resolve_model(self, requested_model: str, task: str = "query") -> str:
        """Resolve 'auto' or return requested model if valid."""
        if requested_model != "auto":
            return requested_model

        if task == "query":
            return "gemini-3.8-flash"
        elif task == "thinking":
            return "gemini-3.8-live-extended-thinking"
        elif task == "tts":
            return "gemini-3.8-flash-tts"
        elif task == "vision":
            return "gemini-3-pro-image"

        return "gemini-3.8-flash"

    async def generate_content(
        self,
        prompt: str,
        system_instruction: str,
        model: str = "gemini-3.8-flash",
    ) -> str:
        """Generate text response from Gemini API."""
        if not self.is_configured():
            raise AppException(
                title="Missing Gemini API Key",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY is not configured in environment or .env file.",
                error_type="https://tpbd.nasa.gov/errors/missing-api-key",
            )

        resolved_model = self.resolve_model(model, task="query")
        url = f"{self.base_url}/models/{resolved_model}:generateContent?key={self.api_key}"

        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.95,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"]
                    return ""
                elif res.status_code in (401, 403):
                    raise AppException(
                        title="Invalid Gemini API Key",
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google AI Studio rejected the provided GEMINI_API_KEY.",
                        error_type="https://tpbd.nasa.gov/errors/unauthorized",
                    )
                else:
                    raise AppException(
                        title="Gemini Upstream Error",
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Google AI Studio returned HTTP {res.status_code}: {res.text}",
                        error_type="https://tpbd.nasa.gov/errors/gemini-upstream-error",
                    )
        except httpx.RequestError as exc:
            logger.warning("Network failure connecting to Google AI Studio: %s", exc)
            raise AppException(
                title="Gemini Network Failure",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Failed to reach Google AI Studio: {str(exc)}",
                error_type="https://tpbd.nasa.gov/errors/network-timeout",
            )

    async def generate_audio_tts(
        self,
        text: str,
        voice_name: str = "Puck",
        model: str = "gemini-3.8-flash-tts",
    ) -> str:
        """Generate base64-encoded audio speech from Gemini TTS API."""
        if not self.is_configured():
            raise AppException(
                title="Missing Gemini API Key",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY is not configured in environment or .env file.",
                error_type="https://tpbd.nasa.gov/errors/missing-api-key",
            )

        resolved_model = self.resolve_model(model, task="tts")
        url = f"{self.base_url}/models/{resolved_model}:generateContent?key={self.api_key}"

        payload: dict[str, Any] = {
            "contents": [{"parts": [{"text": text}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": voice_name
                        }
                    }
                },
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        for part in parts:
                            if "inlineData" in part and "data" in part["inlineData"]:
                                return part["inlineData"]["data"]
                    return ""
                elif res.status_code in (401, 403):
                    raise AppException(
                        title="Invalid Gemini API Key",
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Google AI Studio rejected the provided GEMINI_API_KEY.",
                        error_type="https://tpbd.nasa.gov/errors/unauthorized",
                    )
                else:
                    raise AppException(
                        title="Gemini TTS Upstream Error",
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Google AI Studio TTS returned HTTP {res.status_code}: {res.text}",
                        error_type="https://tpbd.nasa.gov/errors/gemini-upstream-error",
                    )
        except httpx.RequestError as exc:
            logger.warning("Network failure connecting to Gemini TTS: %s", exc)
            raise AppException(
                title="Gemini TTS Network Failure",
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Failed to reach Google AI Studio TTS: {str(exc)}",
                error_type="https://tpbd.nasa.gov/errors/network-timeout",
            )
