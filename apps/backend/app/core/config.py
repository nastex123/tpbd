"""Core application configuration."""
from pathlib import Path
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[4]
ROOT_ENV_FILE = ROOT_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment or root .env."""

    PROJECT_NAME: str = "TPBD Earth System Trend Detective API"
    VERSION: str = "2.1.0"
    API_V1_STR: str = "/api/v1"

    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = False

    # NASA Earthdata Login Credentials
    EARTHDATA_USERNAME: str | None = None
    EARTHDATA_PASSWORD: str | None = None
    EARTHDATA_TOKEN: str | None = None

    # Google Gemini AI Studio Credentials (accepts GEMINI_API_KEY or GOOGLE_API_KEY)
    GEMINI_API_KEY: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    )

    # SQLite Cache Path
    CACHE_DB_PATH: str = "data/cache/tpbd_cache.db"

    # CORS settings (Electron / Vite dev server / production Vercel)
    CORS_ORIGINS: list[str] = [
        "http://127.0.0.1:1420",
        "http://localhost:1420",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "https://desktop-nastex.vercel.app",
    ]

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV_FILE), ".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
