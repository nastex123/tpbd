"""Core application configuration."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env."""

    PROJECT_NAME: str = "TPBD Earth System Trend Detective API"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api/v1"

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True

    # NASA Earthdata Login Credentials
    EARTHDATA_USERNAME: str | None = None
    EARTHDATA_PASSWORD: str | None = None
    EARTHDATA_TOKEN: str | None = None

    # SQLite Cache Path
    CACHE_DB_PATH: str = "data/cache/tpbd_cache.db"

    # CORS settings (Electron / Vite dev server)
    CORS_ORIGINS: list[str] = [
        "http://127.0.0.1:1420",
        "http://localhost:1420",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
