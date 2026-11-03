import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.cache.redis_client import cache
from app.providers.registry import registry
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationLiveBoard
from app.schemas.status import RailwayStatus
from app.services.fare_engine import TelescopicFareEngine

logger = logging.getLogger("railpulse.services.orchestrator")


class ProviderOrchestrator:
    """
    Capability-Aware Provider Orchestrator.
    Routes queries per capability across verified providers with circuit breakers,
    Redis caching, distributed deduplication, and honest data freshness tagging.
    """

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        cache_key = f"railpulse:status:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                return RailwayStatus(**cached)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("LIVE_STATUS")
        for p in providers:
            start_t = time.time()
            try:
                res = await p.get_live_status(train_number)
                latency = (time.time() - start_t) * 1000
                if res:
                    registry.record_success(p.provider_name)
                    # Cache for 45 seconds
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=45)
                    # Broadcast to WebSocket channel
                    await cache.publish_event(f"train_telemetry:{train_number}", res.model_dump(mode="json"))
                    return res
                else:
                    registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_live_status(%s): %s", p.provider_name, train_number, e)

        return None

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        cache_key = f"railpulse:schedule:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            return cached

        providers = registry.get_providers_for_capability("SCHEDULE")
        for p in providers:
            try:
                res = await p.get_schedule(train_number)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res, ttl_seconds=12 * 3600)
                    return res
                registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_schedule: %s", p.provider_name, e)
        return None

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        cache_key = f"railpulse:route:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            return cached

        providers = registry.get_providers_for_capability("ROUTE")
        for p in providers:
            try:
                res = await p.get_route(train_number)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res, ttl_seconds=12 * 3600)
                    return res
                registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_route: %s", p.provider_name, e)
        return None

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        cache_key = f"railpulse:search_trains:{query.lower()}"
        cached = await cache.get_json(cache_key)
        if cached:
            return cached

        providers = registry.get_providers_for_capability("TRAIN_SEARCH")
        for p in providers:
            try:
                res = await p.search_trains(query)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res, ttl_seconds=3600)
                    return res
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on search_trains: %s", p.provider_name, e)
        return []

    async def search_stations(self, query: str) -> List[Station]:
        cache_key = f"railpulse:search_stations:{query.lower()}"
        cached = await cache.get_json(cache_key)
        if cached:
            return [Station(**s) for s in cached]

        providers = registry.get_providers_for_capability("STATION_SEARCH")
        for p in providers:
            try:
                res = await p.search_stations(query)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, [s.model_dump() for s in res], ttl_seconds=86400)
                    return res
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on search_stations: %s", p.provider_name, e)
        return []

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        code = station_code.upper().strip()
        cache_key = f"railpulse:board:{code}:{hours}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                return StationLiveBoard(**cached)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("STATION_LIVE_BOARD")
        for p in providers:
            try:
                res = await p.get_station_board(code, hours=hours)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=60)
                    return res
                registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_station_board: %s", p.provider_name, e)
        return None

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        cache_key = f"railpulse:coaches:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                return CoachComposition(**cached)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("COACH_COMPOSITION")
        for p in providers:
            try:
                res = await p.get_coach_composition(train_number)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=12 * 3600)
                    return res
                registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_coach_composition: %s", p.provider_name, e)
        return None

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        cache_key = f"railpulse:platforms:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            return [PlatformInfo(**p) for p in cached]

        providers = registry.get_providers_for_capability("PLATFORM_INFO")
        for p in providers:
            try:
                res = await p.get_platform_information(train_number)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, [item.model_dump() for item in res], ttl_seconds=3600)
                    return res
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_platform_info: %s", p.provider_name, e)
        return []

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        # PNR is NEVER cached to strictly respect passenger privacy!
        providers = registry.get_providers_for_capability("PNR_STATUS")
        for p in providers:
            try:
                res = await p.get_pnr_status(pnr)
                if res:
                    registry.record_success(p.provider_name)
                    return res
                registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_pnr_status: %s", p.provider_name, e)
        return None

    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> FareEnquiryResult:
        cache_key = f"railpulse:fare:{train_number}:{origin}:{dest}:{quota}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                return FareEnquiryResult(**cached)
            except Exception:
                pass

        # First attempt upstream provider if configured
        providers = registry.get_providers_for_capability("FARE_ENQUIRY")
        for p in providers:
            try:
                res = await p.get_fare(train_number, origin, dest, quota)
                if res:
                    registry.record_success(p.provider_name)
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=86400)
                    return res
            except Exception:
                pass

        # Fallback to verified Railway Board Telescopic Distance Tariff formula
        fare_result = TelescopicFareEngine.calculate_all_classes(
            train_number=train_number,
            train_name=f"Express {train_number}",
            origin=origin,
            destination=dest,
            quota=quota,
        )
        await cache.set_json(cache_key, fare_result.model_dump(mode="json"), ttl_seconds=86400)
        return fare_result


orchestrator = ProviderOrchestrator()
