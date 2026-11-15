"""Unit tests for in-memory KnowledgeService and grounded prompt synthesis (ADR 0009)."""
from app.services.knowledge_service import KnowledgeService


def test_knowledge_service_loads_valid_definitions():
    ks = KnowledgeService()
    t2m_info = ks.get_variable_context("T2M")
    assert "Temperature" in t2m_info["name"]
    assert "MERRA-2" in t2m_info["satellite_instrument"]
    assert "Radiative forcing" in t2m_info["driving_mechanisms"]

    precip_info = ks.get_variable_context("PRECTOTCORR")
    assert "Precipitation" in precip_info["name"]
    assert "GPM" in precip_info["satellite_instrument"]


def test_knowledge_service_teleconnection_pairs():
    ks = KnowledgeService()
    pair = ks.get_teleconnection_pair("hadley_expansion")
    assert pair is not None
    assert "Hadley Cell" in pair["title"]
    assert "congo_basin" in pair["regions"]
    assert "mediterranean_spain" in pair["regions"]
    assert pair["variable_id"] == "PRECTOTCORR"


def test_format_grounding_block_synthesis():
    ks = KnowledgeService()
    block = ks.format_grounding_block(
        variable_id="PRECTOTCORR",
        region_id="congo_basin",
        teleconnection_pair_id="hadley_expansion",
    )
    assert "Physical Variable:" in block
    assert "Corrected Total Precipitation" in block
    assert "Planetary Teleconnection: Hadley Cell" in block
    assert "Regional Biophysical Drivers:" in block
