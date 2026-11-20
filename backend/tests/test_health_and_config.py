import pytest
from app.config import settings

def test_settings_loaded():
    assert settings.PROJECT_NAME is not None
    assert len(settings.PROJECT_NAME) > 0
    assert settings.VERSION is not None

def test_cors_origins_configured():
    assert isinstance(settings.CORS_ORIGINS, list)

def test_environment_mode():
    assert settings.ENVIRONMENT in ["development", "production", "testing"]
