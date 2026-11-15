"""In-memory domain knowledge service for structured scientific grounding (ADR 0009)."""
import json
from pathlib import Path
from typing import Any
from app.core.logging import get_logger

logger = get_logger(__name__)


class KnowledgeService:
    """Provides deterministic Earth science context for AI Copilot grounding."""

    def __init__(self, data_path: Path | None = None) -> None:
        if data_path is None:
            data_path = Path(__file__).resolve().parent.parent / "data" / "teleconnections.json"
        self.data_path = data_path
        self._kb: dict[str, Any] = self._load_knowledge_base()

    def _load_knowledge_base(self) -> dict[str, Any]:
        if not self.data_path.exists():
            logger.warning("Knowledge base not found at %s. Using fallback empty KB.", self.data_path)
            return {"variables": {}, "teleconnection_pairs": {}, "biomes": {}}
        try:
            return json.loads(self.data_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.error("Failed to parse knowledge base: %s", exc)
            return {"variables": {}, "teleconnection_pairs": {}, "biomes": {}}

    def get_variable_context(self, variable_id: str) -> dict[str, str]:
        """Return physical measurement principles and instruments for a variable."""
        var_data = self._kb.get("variables", {}).get(variable_id.upper(), {})
        return {
            "name": var_data.get("name", variable_id),
            "satellite_instrument": var_data.get("satellite_instrument", "NASA Earth Observing System"),
            "physical_description": var_data.get("physical_description", "Earth system observation."),
            "driving_mechanisms": var_data.get("driving_mechanisms", "Thermodynamic and radiative atmospheric processes."),
        }

    def get_biome_context(self, region_id: str) -> dict[str, str]:
        """Return ecosystem vulnerability and physical drivers for a biome."""
        biome_data = self._kb.get("biomes", {}).get(region_id.lower(), {})
        return {
            "key_drivers": biome_data.get("key_drivers", "Regional land-atmosphere feedbacks."),
            "ecosystem_vulnerability": biome_data.get("ecosystem_vulnerability", "Sensitivity to climatic variability."),
        }

    def get_teleconnection_pair(self, pair_id: str) -> dict[str, Any] | None:
        """Return the biophysical explanation for an opposing trend teleconnection pair."""
        return self._kb.get("teleconnection_pairs", {}).get(pair_id.lower())

    def format_grounding_block(
        self,
        variable_id: str,
        region_id: str | None = None,
        teleconnection_pair_id: str | None = None,
    ) -> str:
        """Synthesize a compact, authoritative scientific grounding block for Gemini prompts."""
        var_info = self.get_variable_context(variable_id)
        lines = [
            f"Physical Variable: {var_info['name']} ({variable_id})",
            f"Sensor / Assimilation: {var_info['satellite_instrument']}",
            f"Measurement Definition: {var_info['physical_description']}",
            f"General Drivers: {var_info['driving_mechanisms']}",
        ]

        if region_id:
            biome = self.get_biome_context(region_id)
            lines.append(f"Regional Biophysical Drivers: {biome['key_drivers']}")
            lines.append(f"Ecosystem Vulnerability: {biome['ecosystem_vulnerability']}")

        if teleconnection_pair_id:
            pair = self.get_teleconnection_pair(teleconnection_pair_id)
            if pair:
                lines.append(f"Planetary Teleconnection: {pair['title']}")
                lines.append(f"Teleconnection Mechanism: {pair['biophysical_driver']}")
                lines.append(f"Expected Asymmetry: {pair['scientific_explanation']}")

        return "\n".join(lines)
