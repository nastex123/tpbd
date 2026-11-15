"""Curated preset regions repository."""
from app.schemas.regions import Region
from app.schemas.common import Coordinates

CURATED_REGIONS: list[Region] = [
    Region(
        region_id="amazon",
        name="Amazon Basin (Manaus)",
        center_coordinates=Coordinates(latitude=-3.1, longitude=-60.0),
        representative_cell="-3.125, -60.000 (0.5° grid)",
        description="Central Amazon tropical rainforest biome experiencing increasing dry-season lengths.",
        scientific_context="Key planetary carbon sink; useful for contrasting rainforest drying against equatorial monsoon regions.",
        teleconnection_pair="polar_vs_tropical",
        biome_category="Tropical Rainforest",
    ),
    Region(
        region_id="guajira",
        name="La Guajira (Riohacha)",
        center_coordinates=Coordinates(latitude=11.5, longitude=-72.9),
        representative_cell="11.500, -72.900 (0.5° grid)",
        description="Semi-arid Caribbean coastal zone highly sensitive to ENSO cycles and rainfall variability.",
        scientific_context="Illustrates acute vulnerability to precipitation deficits and drought intensification.",
        teleconnection_pair="enso_asymmetry",
        biome_category="Semi-Arid Desert",
    ),
    Region(
        region_id="sahel",
        name="Sahel (Niamey, Niger)",
        center_coordinates=Coordinates(latitude=13.5, longitude=2.1),
        representative_cell="13.500, 2.100 (0.5° grid)",
        description="Transition zone between Sahara Desert and Sudanian Savanna with strong monsoon seasonality.",
        scientific_context="Classic benchmark for testing decadal rainfall recovery vs. persistent temperature increase.",
        teleconnection_pair="hadley_expansion",
        biome_category="Semi-Arid Transition",
    ),
    Region(
        region_id="australia_se",
        name="Southeast Australia (Murray-Darling)",
        center_coordinates=Coordinates(latitude=-35.0, longitude=145.0),
        representative_cell="-35.000, 145.000 (0.5° grid)",
        description="Major agricultural basin prone to compound drought and heatwave extremes.",
        scientific_context="Demonstrates high year-to-year variability and multidecadal warming trends in the Southern Hemisphere.",
        teleconnection_pair=None,
        biome_category="Temperate Agricultural Basin",
    ),
    Region(
        region_id="arctic_svalbard",
        name="Arctic Archipelago (Svalbard)",
        center_coordinates=Coordinates(latitude=78.2, longitude=15.6),
        representative_cell="78.200, 15.600 (0.5° grid)",
        description="High-latitude polar archipelago experiencing rapid Arctic amplification and sea-ice retraction.",
        scientific_context="Warming at more than triple the global average rate; classic sentinel for cryospheric change.",
        teleconnection_pair="polar_vs_tropical",
        biome_category="Polar Cryosphere",
    ),
    Region(
        region_id="aral_sea",
        name="Aral Sea Basin (Central Asia)",
        center_coordinates=Coordinates(latitude=45.0, longitude=59.0),
        representative_cell="45.000, 59.000 (0.5° grid)",
        description="Inland endorheic basin heavily modified by anthropogenic desiccation and land-use transformation.",
        scientific_context="Demonstrates how loss of a massive water body intensifies summer-winter continental temperature swings.",
        teleconnection_pair=None,
        biome_category="Inland Endorheic Basin",
    ),
    Region(
        region_id="california_valley",
        name="California Central Valley (Fresno)",
        center_coordinates=Coordinates(latitude=36.7, longitude=-119.8),
        representative_cell="36.700, -119.800 (0.5° grid)",
        description="Productive agricultural valley experiencing extreme whiplash between multi-year drought and atmospheric rivers.",
        scientific_context="Teleconnected to equatorial Pacific ENSO cycles; contrasts wet atmospheric river surges with Caribbean drying.",
        teleconnection_pair="enso_asymmetry",
        biome_category="Mediterranean Agricultural Zone",
    ),
    Region(
        region_id="tibetan_plateau",
        name="Tibetan Plateau ('Third Pole')",
        center_coordinates=Coordinates(latitude=32.0, longitude=88.0),
        representative_cell="32.000, 88.000 (0.5° grid)",
        description="Massive high-elevation plateau holding the largest volume of ice outside the polar ice caps.",
        scientific_context="Feeds major Asian river systems; highly sensitive to elevation-dependent warming.",
        teleconnection_pair=None,
        biome_category="Alpine Cryosphere",
    ),
    Region(
        region_id="congo_basin",
        name="Congo Basin (Kisangani, DRC)",
        center_coordinates=Coordinates(latitude=0.5, longitude=25.2),
        representative_cell="0.500, 25.200 (0.5° grid)",
        description="Second largest continuous tropical moist forest on Earth, centered along the Intertropical Convergence Zone.",
        scientific_context="Deep convective precipitation core; central to evaluating tropical precipitation intensification under Hadley circulation.",
        teleconnection_pair="hadley_expansion",
        biome_category="Equatorial Rainforest",
    ),
    Region(
        region_id="greenland_nuuk",
        name="SW Greenland (Nuuk)",
        center_coordinates=Coordinates(latitude=64.2, longitude=-51.7),
        representative_cell="64.200, -51.700 (0.5° grid)",
        description="Subpolar coastal zone adjacent to Greenland ice sheet peripheral melting lobes.",
        scientific_context="Directly tied to North Atlantic meltwater runoff and ice-albedo feedback dynamics.",
        teleconnection_pair=None,
        biome_category="Ice Sheet Margin",
    ),
    Region(
        region_id="coral_sea",
        name="Great Barrier Reef (Coral Sea)",
        center_coordinates=Coordinates(latitude=-18.0, longitude=147.5),
        representative_cell="-18.000, 147.500 (0.5° grid)",
        description="Vast tropical marine ecosystem susceptible to marine heatwaves and thermal bleaching thresholds.",
        scientific_context="Illustrates ocean-atmosphere thermal flux and rising minimum night temperatures over shallow marine waters.",
        teleconnection_pair=None,
        biome_category="Tropical Marine Ecosystem",
    ),
    Region(
        region_id="mediterranean_spain",
        name="Mediterranean Basin (Seville, Spain)",
        center_coordinates=Coordinates(latitude=37.4, longitude=-5.9),
        representative_cell="37.400, -5.900 (0.5° grid)",
        description="Southwestern European climate hotspot vulnerable to subtropical dry-zone expansion and summer heat domes.",
        scientific_context="Demonstrates poleward expansion of the descending branch of the Hadley circulation.",
        teleconnection_pair="hadley_expansion",
        biome_category="Subtropical Aridifying Hotspot",
    ),
]


TELECONNECTION_PAIRS = [
    {
        "pair_id": "hadley_expansion",
        "title": "Hadley Cell Expansion & Tropical Redistribution",
        "driver_mechanism": "Poleward expansion of subtropical dry zones while equatorial convective core intensifies.",
        "region_a_id": "congo_basin",
        "region_b_id": "mediterranean_spain",
        "variable_id": "PRECTOTCORR",
        "expected_divergence": "Congo Basin experiences convective rainfall persistence, while the Mediterranean experiences declining precipitation.",
    },
    {
        "pair_id": "enso_asymmetry",
        "title": "Asymmetric ENSO Teleconnection",
        "driver_mechanism": "Displacement of the Pacific Walker circulation shifting atmospheric moisture pathways.",
        "region_a_id": "guajira",
        "region_b_id": "california_valley",
        "variable_id": "PRECTOTCORR",
        "expected_divergence": "La Guajira suffers severe drought deficits during strong warm ENSO, while California receives intense atmospheric river rainfall.",
    },
    {
        "pair_id": "polar_vs_tropical",
        "title": "Polar Amplification vs. Tropical Thermal Inertia",
        "driver_mechanism": "Positive sea-ice albedo feedback in the Arctic vs. evaporative latent heat buffering in tropical rainforests.",
        "region_a_id": "arctic_svalbard",
        "region_b_id": "amazon",
        "variable_id": "T2M",
        "expected_divergence": "Svalbard exhibits rapid decadal warming (>1.5°C/decade) contrasting with steady Amazon warming accompanied by hydrological drying.",
    },
]


class RegionRepository:
    """In-memory repository for pre-configured baseline regions and teleconnection pairs."""

    def list_all(self) -> list[Region]:
        return CURATED_REGIONS

    def get_by_id(self, region_id: str) -> Region | None:
        for r in CURATED_REGIONS:
            if r.region_id.lower() == region_id.lower():
                return r
        return None

    def list_teleconnection_pairs(self) -> list[dict]:
        return TELECONNECTION_PAIRS

    def get_pair_by_id(self, pair_id: str) -> dict | None:
        for p in TELECONNECTION_PAIRS:
            if p["pair_id"].lower() == pair_id.lower():
                return p
        return None
