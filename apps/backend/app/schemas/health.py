"""Health response schema matching OpenAPI specification."""
from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System operational status and local cache availability."""

    status: str = Field(default="ok", description="Operational status flag")
    version: str = Field(default="2.1.0", description="API semantic version")
    offline_demo_ready: bool = Field(
        default=False,
        description="True if curated preset datasets are cached locally and verified for offline execution",
    )
    cached_regions: list[str] = Field(
        default_factory=list,
        description="List of region IDs currently available in the local cache",
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Current server UTC timestamp",
    )
