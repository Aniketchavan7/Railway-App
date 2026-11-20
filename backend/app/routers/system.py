from datetime import datetime, timezone
import time
from fastapi import APIRouter, Response
from app.config import settings
from app.providers.registry import registry
from app.schemas.status import ResponseEnvelope

router = APIRouter(tags=["System & Health"])

_START_TIME = time.time()


@router.get("/health", response_model=ResponseEnvelope)
@router.get("/api/system/health", response_model=ResponseEnvelope)
@router.get("/api/v1/health", response_model=ResponseEnvelope)
@router.get("/v1/health", response_model=ResponseEnvelope)
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


@router.get("/metrics")
@router.get("/api/v1/metrics")
async def prometheus_metrics():
    """Prometheus-compatible plain text metrics endpoint."""
    uptime = time.time() - _START_TIME
    provider_count = len(registry.providers)
    
    lines = [
        "# HELP railpulse_uptime_seconds Application uptime in seconds.",
        "# TYPE railpulse_uptime_seconds gauge",
        f"railpulse_uptime_seconds {uptime:.2f}",
        "# HELP railpulse_providers_registered Number of registered telemetry providers.",
        "# TYPE railpulse_providers_registered gauge",
        f"railpulse_providers_registered {provider_count}",
        "# HELP railpulse_status Active health status (1 = healthy, 0 = degraded).",
        "# TYPE railpulse_status gauge",
        "railpulse_status 1",
    ]
    for name, provider in registry.providers.items():
        is_healthy = 1 if getattr(provider, "is_healthy", True) else 0
        lines.append(f'railpulse_provider_healthy{{provider="{name}"}} {is_healthy}')

    return Response(content="\n".join(lines) + "\n", media_type="text/plain; version=0.0.4; charset=utf-8")


@router.get("/providers/health", response_model=ResponseEnvelope)
@router.get("/api/v1/providers/health", response_model=ResponseEnvelope)
@router.get("/v1/providers/health", response_model=ResponseEnvelope)
async def providers_health():
    statuses = {}
    for name, provider in registry.providers.items():
        try:
            statuses[name] = await provider.get_health()
        except Exception as e:
            statuses[name] = {"status": "ERROR", "error": str(e)}
    return ResponseEnvelope(data=statuses)


@router.get("/providers/status", response_model=ResponseEnvelope)
@router.get("/api/v1/providers/status", response_model=ResponseEnvelope)
@router.get("/v1/providers/status", response_model=ResponseEnvelope)
async def provider_registry_status():
    return ResponseEnvelope(data=registry.get_provider_status())
