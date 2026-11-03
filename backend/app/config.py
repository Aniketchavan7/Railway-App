from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RailPulse"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Database & Cache
    DATABASE_URL: str = "sqlite+aiosqlite:///./railpulse.db"
    REDIS_URL: Optional[str] = None

    # Upstream Railway Providers
    RAILWAY_ENGINE_BASE_URL: str = "https://railway-engine.apkscope.workers.dev/v1"
    RAILWAY_ENGINE_API_KEY: str = ""
    RAILRADAR_BASE_URL: str = "https://api.railradar.in/v1"
    RAILRADAR_API_KEY: str = ""

    # NTES / Reference Mode
    NTES_REFERENCE_URL: str = "https://enquiry.indianrail.gov.in/mntes"

    # Offline Simulator (Disabled in production by default)
    ENABLE_SIMULATOR: bool = True

    # xKiro AI Integration (100% Free Tier on api.xkiro.com/v1)
    XKIRO_BASE_URL: str = "https://api.xkiro.com/v1"
    XKIRO_API_KEY: str = ""
    XKIRO_MODEL: str = "mistralai/mistral-small-2603"  # Free tier default (or qwen/qwen3.7-flash:free)

    # Security & CORS
    JWT_SECRET: str = "railpulse_super_secret_jwt_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://railpulse.pages.dev",
        "https://*.pages.dev",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
