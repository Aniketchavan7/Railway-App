"""Tests never touch the network: no provider quota, no LLM bills, and no flakiness."""
from datetime import datetime, timedelta
import pytest
from app.cache.redis_client import cache
from app.config import settings
from app.providers.base import ProviderUnavailable
from app.providers.rail_radar import RailRadarProvider
from app.providers.railway_engine import RailwayEngineProvider
from app.providers.registry import registry
from app.services.train_schedule_service import IST


async def _offline(self, path, params=None):
    raise ProviderUnavailable(f"network is disabled in tests: {path}")


@pytest.fixture(autouse=True)
def isolated_backend(monkeypatch):
    monkeypatch.setattr(RailwayEngineProvider, "_get", _offline)
    monkeypatch.setattr(RailRadarProvider, "_get", _offline)
    monkeypatch.setattr(settings, "XKIRO_API_KEY", "")
    monkeypatch.setattr(settings, "ENABLE_SIMULATOR", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    cache._memory._store.clear()
    cache._memory._subscribers.clear()
    cache.is_redis_active = False
    for breaker in registry.circuit_breakers.values():
        breaker.record_success()
    yield


def upstream_status(
    status="RUNNING",
    train="12951",
    current=("CMU", "Chau Mahla"),
    previous=("NAD", "Nagda Jn"),
    upcoming=("KOTA", "Kota Jn"),
    eta=None,
    delay=0,
    percent=75,
    exceptions=None,
):
    """A provider status in the shape the real API returned on 5 Nov 2026."""
    station = lambda s: {"code": s[0], "name": s[1]} if s else None
    # Times relative to now, so results do not depend on when the tests run.
    now = datetime.now(IST)
    observed = now.isoformat()
    eta = eta or (now + timedelta(minutes=300)).isoformat()
    return {
        "trainNumber": train,
        "trainName": "NDLS TEJAS RAJ",
        "journeyDate": "2026-11-04",
        "status": status,
        "origin": {"code": "MMCT", "name": "Mumbai Central"},
        "destination": {"code": "NDLS", "name": "New Delhi"},
        "currentStation": station(current),
        "previousStation": station(previous),
        "nextStation": station(upcoming),
        "position": {"source": "LAST_REPORTED", "stationCode": current[0] if current else None, "latitude": None, "longitude": None, "observedAt": observed},
        "speedKmph": None,
        "delayMinutes": delay,
        "delay": {"minutes": delay, "source": "PROVIDER"},
        "eta": {"source": "SCHEDULED", "stationCode": upcoming[0] if upcoming else None, "value": eta},
        "routeProgress": {"completedStops": 6, "remainingStops": 3, "totalStops": 9, "percent": percent},
        "exceptions": exceptions or [],
        "freshness": {"observedAt": observed, "ageSeconds": 0, "state": "LIVE", "provider": "whereismytrain"},
        "source": "whereismytrain",
        "confidence": "MEDIUM",
        "observedAt": observed,
    }
