"""Integration schemas for NASA AppEEARS authentication and tasks."""
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.common import Coordinates


class DateRange(BaseModel):
    """Start and end dates formatted for AppEEARS."""

    start_date: str = Field(..., description="Start date (MM-DD-YYYY)")
    end_date: str = Field(..., description="End date (MM-DD-YYYY)")


class AppEEARSTaskRequest(BaseModel):
    """Task submission payload for AppEEARS point sample extraction."""

    task_name: str = Field(..., description="User-assigned task name")
    product_and_layer: str = Field(..., description="AppEEARS product and layer identifier (e.g. MOD13Q1.061,_250m_16_days_NDVI)")
    coordinates: Coordinates = Field(..., description="Target point coordinates")
    date_range: DateRange = Field(..., description="Temporal window")


class AppEEARSTaskResponse(BaseModel):
    """Response returned upon accepting a new task."""

    task_id: str = Field(..., description="AppEEARS task UUID")
    status: str = Field(default="pending", description="Initial queue status")


class AppEEARSTaskStatus(BaseModel):
    """Status details for a processing or completed task."""

    task_id: str = Field(..., description="Unique task identifier")
    status: str = Field(..., description="State: pending, processing, done, or error")
    progress_percentage: int = Field(default=0, ge=0, le=100, description="Overall percent complete")
    downloadable_csv_url: str | None = Field(default=None, description="Direct URL to download result CSV bundle")


class AppEEARSLoginRequest(BaseModel):
    """Credentials payload for AppEEARS session login."""

    username: str = Field(..., description="NASA Earthdata Login username")
    password: str = Field(..., description="NASA Earthdata Login password")


class AppEEARSLoginResponse(BaseModel):
    """Token response from AppEEARS login."""

    token: str = Field(..., description="Bearer session token")
    token_type: str = Field(default="Bearer", description="Token type")
    expiration: datetime = Field(..., description="Token expiration timestamp (48h)")


class AppEEARSAuthStatus(BaseModel):
    """Current engine AppEEARS authentication state."""

    authenticated: bool = Field(..., description="True if a valid unexpired token is stored")
    username: str | None = Field(default=None, description="Active Earthdata username")
    expiration: datetime | None = Field(default=None, description="Expiration date-time")
