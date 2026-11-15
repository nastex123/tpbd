"""Region schema matching OpenAPI specification."""
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates


class Region(BaseModel):
    """Curated geographic study region for baseline investigation."""

    region_id: str = Field(..., description="Unique slug identifier (e.g. amazon, sahel)")
    name: str = Field(..., description="Human-readable region name")
    center_coordinates: Coordinates = Field(..., description="Center latitude and longitude")
    representative_cell: str = Field(..., description="Representative data grid cell")
    description: str = Field(..., description="Geographical and ecological context")
    scientific_context: str = Field(..., description="Scientific motivation for trend analysis")
    teleconnection_pair: str | None = Field(
        default=None,
        description="Optional identifier of the paired teleconnection region (e.g. 'hadley_expansion', 'enso_asymmetry')",
    )
    biome_category: str | None = Field(
        default=None,
        description="Planetary biome classification (e.g. 'Tropical Rainforest', 'Polar Cryosphere')",
    )
