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
    ),
    Region(
        region_id="guajira",
        name="La Guajira (Riohacha)",
        center_coordinates=Coordinates(latitude=11.5, longitude=-72.9),
        representative_cell="11.500, -72.900 (0.5° grid)",
        description="Semi-arid Caribbean coastal zone highly sensitive to ENSO cycles and rainfall variability.",
        scientific_context="Illustrates acute vulnerability to precipitation deficits and drought intensification.",
    ),
    Region(
        region_id="sahel",
        name="Sahel (Niamey, Niger)",
        center_coordinates=Coordinates(latitude=13.5, longitude=2.1),
        representative_cell="13.500, 2.100 (0.5° grid)",
        description="Transition zone between Sahara Desert and Sudanian Savanna with strong monsoon seasonality.",
        scientific_context="Classic benchmark for testing decadal rainfall recovery vs. persistent temperature increase.",
    ),
    Region(
        region_id="australia_se",
        name="Southeast Australia (Murray-Darling)",
        center_coordinates=Coordinates(latitude=-35.0, longitude=145.0),
        representative_cell="-35.000, 145.000 (0.5° grid)",
        description="Major agricultural basin prone to compound drought and heatwave extremes.",
        scientific_context="Demonstrates high year-to-year variability and multidecadal warming trends in the Southern Hemisphere.",
    ),
]


class RegionRepository:
    """In-memory repository for pre-configured baseline regions."""

    def list_all(self) -> list[Region]:
        return CURATED_REGIONS

    def get_by_id(self, region_id: str) -> Region | None:
        for r in CURATED_REGIONS:
            if r.region_id.lower() == region_id.lower():
                return r
        return None
