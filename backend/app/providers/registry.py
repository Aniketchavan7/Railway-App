import logging
from typing import Any, Dict, List, Optional
from app.config import settings
from app.providers.base import RailwayProvider
from app.providers.circuit_breaker import CircuitBreaker, CircuitState
from app.providers.ntes_reference import NTESReferenceProvider
from app.providers.rail_radar import RailRadarProvider
from app.providers.railway_engine import RailwayEngineProvider
from app.providers.simulator import OfflineSimulatorProvider

logger = logging.getLogger("railpulse.providers.registry")


class CapabilityRegistry:
    def __init__(self):
        self.providers: Dict[str, RailwayProvider] = {
            "railway_engine": RailwayEngineProvider(),
            "rail_radar": RailRadarProvider(),
            "ntes_reference": NTESReferenceProvider(),
            "offline_simulator": OfflineSimulatorProvider(),
        }

        self.circuit_breakers: Dict[str, CircuitBreaker] = {
            "railway_engine": CircuitBreaker("railway_engine", failure_threshold=3, recovery_timeout_seconds=60.0),
            "rail_radar": CircuitBreaker("rail_radar", failure_threshold=2, recovery_timeout_seconds=90.0),
            "ntes_reference": CircuitBreaker("ntes_reference", failure_threshold=1, recovery_timeout_seconds=300.0),
            "offline_simulator": CircuitBreaker("offline_simulator", failure_threshold=10, recovery_timeout_seconds=10.0),
        }

        # Capability Priority Ordering
        self.capability_routing: Dict[str, List[str]] = {
            "LIVE_STATUS": ["railway_engine", "rail_radar", "offline_simulator"],
            "SCHEDULE": ["railway_engine", "rail_radar", "offline_simulator"],
            "ROUTE": ["railway_engine", "rail_radar", "offline_simulator"],
            "TRAIN_SEARCH": ["railway_engine", "rail_radar", "offline_simulator"],
            "STATION_SEARCH": ["railway_engine", "rail_radar", "offline_simulator"],
            "STATION_LIVE_BOARD": ["railway_engine", "rail_radar", "offline_simulator"],
            "COACH_COMPOSITION": ["railway_engine", "offline_simulator"],
            "PLATFORM_INFO": ["railway_engine", "offline_simulator"],
            "PNR_STATUS": ["railway_engine", "offline_simulator"],
            "FARE_ENQUIRY": ["railway_engine"],
            "HEALTH": ["railway_engine", "rail_radar", "ntes_reference", "offline_simulator"],
        }

    def get_providers_for_capability(self, capability: str) -> List[RailwayProvider]:
        provider_names = self.capability_routing.get(capability, [])
        selected: List[RailwayProvider] = []
        for name in provider_names:
            if name == "offline_simulator" and not settings.ENABLE_SIMULATOR:
                continue

            provider = self.providers.get(name)
            cb = self.circuit_breakers.get(name)
            if provider and (cb is None or cb.can_execute()):
                selected.append(provider)
        return selected

    def record_success(self, provider_name: str):
        if provider_name in self.circuit_breakers:
            self.circuit_breakers[provider_name].record_success()

    def record_failure(self, provider_name: str):
        if provider_name in self.circuit_breakers:
            self.circuit_breakers[provider_name].record_failure()

    def get_provider_status(self) -> Dict[str, Any]:
        result = {}
        for name, provider in self.providers.items():
            cb = self.circuit_breakers.get(name)
            result[name] = {
                "provider_name": name,
                "supported_capabilities": provider.supported_capabilities,
                "circuit_state": cb.state.value if cb else "CLOSED",
                "failure_count": cb.failure_count if cb else 0,
                "last_failure_time": cb.last_failure_time if cb else None,
                "last_success_time": cb.last_success_time if cb else None,
            }
        return result


registry = CapabilityRegistry()
