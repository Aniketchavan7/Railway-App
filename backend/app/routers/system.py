from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.providers.registry import registry
from app.schemas.status import ResponseEnvelope

router = APIRouter(tags=["System & Health"])


@router.get("/health", response_model=ResponseEnvelope)
async def system_health():
    return ResponseEnvelope(
        data={
            "status": "HEALTHY",
            "project": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


@router.get("/providers/health", response_model=ResponseEnvelope)
async def providers_health():
    statuses = {}
    for name, provider in registry.providers.items():
        try:
            statuses[name] = await provider.get_health()
        except Exception as e:
            statuses[name] = {"status": "ERROR", "error": str(e)}
    return ResponseEnvelope(data=statuses)


@router.get("/providers/status", response_model=ResponseEnvelope)
async def provider_registry_status():
    return ResponseEnvelope(data=registry.get_provider_status())
