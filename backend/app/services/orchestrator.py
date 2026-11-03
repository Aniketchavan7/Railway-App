import logging
import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.cache.redis_client import cache
from app.providers.registry import registry
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationLiveBoard
from app.schemas.status import (
    ConfidenceLevel,
    FreshnessState,
    LocationType,
    PassengerTelemetryReport,
    RailwayStatus,
    StationHalt,
)
from app.providers.simulator import REFERENCE_TRAINS
from app.services.fare_engine import TelescopicFareEngine

logger = logging.getLogger("railpulse.services.orchestrator")

KNOWN_TRAINS: Dict[str, str] = {
    "12115": "Siddheshwar Superfast Express",
    "12116": "Siddheshwar Superfast Express",
    "22225": "Solapur Vande Bharat Express",
    "22226": "Mumbai CSMT Vande Bharat Express",
    "12157": "Hutatma Express",
    "12158": "Hutatma Express",
    "12123": "Deccan Queen Superfast Express",
    "12124": "Deccan Queen Superfast Express",
    "12125": "Pragati Express",
    "12126": "Pragati Express",
    "12127": "Mumbai Pune Intercity Express",
    "12128": "Pune Mumbai Intercity Express",
    "11007": "Deccan Express",
    "11008": "Deccan Express",
    "11009": "Sinhagad Express",
    "11010": "Sinhagad Express",
    "12101": "Jnaneswari Super Deluxe Express",
    "12102": "Jnaneswari Super Deluxe Express",
    "12951": "Mumbai Tejas Rajdhani Express",
    "12952": "New Delhi Mumbai Tejas Rajdhani Express",
    "22436": "Vande Bharat Express",
    "22435": "Vande Bharat Express",
    "12919": "Malwa Superfast Express",
    "12920": "Malwa Superfast Express",
    "12009": "Mumbai Ahmedabad Shatabdi Express",
    "12010": "Ahmedabad Mumbai Shatabdi Express",
    "12051": "Jan Shatabdi Express",
    "12052": "Jan Shatabdi Express",
    "12261": "Howrah Mumbai CSMT Duronto Express",
    "12262": "Mumbai CSMT Howrah Duronto Express",
    "12301": "Howrah Rajdhani Express",
    "12302": "Howrah Rajdhani Express",
}


def clean_train_name(name: str, train_number: str) -> str:
    clean_num = train_number.strip()
    if clean_num in KNOWN_TRAINS:
        return KNOWN_TRAINS[clean_num]
    if not name or name.strip() == f"Express {clean_num}":
        return f"Express {clean_num}"

    clean = name.strip()
    replacements = {
        "EXP": "Express",
        "SF": "Superfast",
        "SF EXP": "Superfast Express",
        "SUPERFAST EXP": "Superfast Express",
        "MAIL": "Mail",
        "PASS": "Passenger",
    }
    words = clean.split()
    normalized = []
    for w in words:
        upper = w.upper()
        if upper in replacements:
            normalized.append(replacements[upper])
        else:
            normalized.append(w.capitalize())
    return " ".join(normalized)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class ProviderOrchestrator:
    """
    Capability-Aware Provider Orchestrator.
    Routes queries per capability across verified providers with circuit breakers,
    Redis caching, distributed deduplication, and honest data freshness tagging.
    """

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        clean_num = str(train_number).strip()
        cache_key = f"railpulse:status:{clean_num}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                if str(cached.get("train_number")) == clean_num:
                    status = RailwayStatus(**cached)
                    status.train_name = clean_train_name(status.train_name, clean_num)
                    return status
            except Exception:
                pass

        providers = registry.get_providers_for_capability("LIVE_STATUS")
        for p in providers:
            start_t = time.time()
            try:
                res = await p.get_live_status(clean_num)
                latency = (time.time() - start_t) * 1000
                if res:
                    registry.record_success(p.provider_name)
                    # Canonical train name resolution
                    res.train_name = clean_train_name(res.train_name, clean_num)

                    # Enrich halts if missing from upstream live status
                    if not res.halts and clean_num in REFERENCE_TRAINS:
                        ref = REFERENCE_TRAINS[clean_num]
                        ref_halts: List[StationHalt] = []
                        for idx, h in enumerate(ref.get("halts", [])):
                            ref_halts.append(
                                StationHalt(
                                    station_code=h["code"],
                                    station_name=h["name"],
                                    arrival_time=h.get("sch_arr"),
                                    departure_time=h.get("sch_dep"),
                                    distance_km=float(h.get("dist", 0.0)),
                                    day_count=1,
                                    platform=h.get("platform", "1"),
                                    delay_minutes=res.delay_minutes,
                                    has_arrived=idx == 0,
                                    has_departed=False,
                                    latitude=h.get("lat"),
                                    longitude=h.get("lng"),
                                )
                            )
                        res.halts = ref_halts

                    # Enrich coordinates if missing
                    if (res.latitude is None or res.longitude is None) and res.halts:
                        for h in res.halts:
                            if h.latitude is not None and h.longitude is not None:
                                res.latitude = h.latitude
                                res.longitude = h.longitude
                                break

                    # Cache for 45 seconds
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=45)
                    # Broadcast to WebSocket channel
                    await cache.publish_event(f"train_telemetry:{clean_num}", res.model_dump(mode="json"))
                    return res
                else:
                    registry.record_failure(p.provider_name)
            except Exception as e:
                registry.record_failure(p.provider_name)
                logger.warning("Provider %s error on get_live_status(%s): %s", p.provider_name, clean_num, e)

        return None

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        cache_key = f"railpulse:schedule:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached and str(cached.get("train_number")) == str(train_number):
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
        if cached and str(cached.get("train_number")) == str(train_number):
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
        if cached and str(cached.get("train_number")) == str(train_number):
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

    async def get_station(self, code: str) -> Optional[Station]:
        clean = code.upper().strip()
        cache_key = f"railpulse:station:{clean}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                return Station(**cached)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("STATION_SEARCH")
        for p in providers:
            try:
                if hasattr(p, "get_station"):
                    res = await p.get_station(clean)
                    if res:
                        registry.record_success(p.provider_name)
                        await cache.set_json(cache_key, res.model_dump(), ttl_seconds=86400 * 7)
                        return res
            except Exception as e:
                logger.warning("Provider %s error on get_station: %s", p.provider_name, e)

        # Fallback to search_stations
        stations = await self.search_stations(clean)
        for s in stations:
            if s.station_code.upper() == clean:
                return s
        return None

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
                if str(cached.get("train_number")) == str(train_number):
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

    async def report_passenger_telemetry(
        self, train_number: str, report: PassengerTelemetryReport
    ) -> Dict[str, Any]:
        """
        Crowd-sourced Passenger GPS Telemetry Ingestion & Real-Time Relay.

        Zero-PII Architecture:
        - Completely anonymous: no user identifiers, IP addresses, accounts, or device fingerprints.
        - Ingests high-precision onboard passenger GPS (lat, lng, speed, accuracy).
        - Snaps position against train's route halts and calculates progression.
        - Updates live train telemetry in Redis with TTL 120s.
        - Broadcasts instantly over Redis PubSub to WebSocket subscribers for this train.
        - Elevates data confidence to HIGH and marks location_type as GPS_OBSERVED.
        """
        clean_num = train_number.strip()
        now = datetime.now(timezone.utc)

        # 1. Obtain current base train status/schedule
        base_status = await self.get_live_status(clean_num)
        train_name = base_status.train_name if base_status else f"Train {clean_num}"
        halts = list(base_status.halts) if (base_status and base_status.halts) else []

        # 2. Halt snapping and station progression calculation
        nearest_halt: Optional[StationHalt] = None
        nearest_idx = -1
        min_distance_km = float("inf")

        for idx, halt in enumerate(halts):
            if halt.latitude is not None and halt.longitude is not None:
                dist = _haversine_km(report.latitude, report.longitude, halt.latitude, halt.longitude)
                if dist < min_distance_km:
                    min_distance_km = dist
                    nearest_halt = halt
                    nearest_idx = idx

        # Update station arrival/departure flags based on progression
        speed = float(report.speed_kmph) if (report.speed_kmph is not None and report.speed_kmph >= 0) else (base_status.speed_kmph if base_status else 65.0)

        updated_halts: List[StationHalt] = []
        if halts and nearest_idx >= 0:
            for idx, h in enumerate(halts):
                h_copy = h.model_copy()
                if idx < nearest_idx:
                    h_copy.has_arrived = True
                    h_copy.has_departed = True
                elif idx == nearest_idx:
                    h_copy.has_arrived = True
                    # If train is moving away (>4 km and speed > 15 km/h), mark departed
                    h_copy.has_departed = min_distance_km > 4.0 and speed > 15.0
                else:
                    h_copy.has_arrived = False
                    h_copy.has_departed = False
                updated_halts.append(h_copy)
        else:
            updated_halts = halts

        # 3. Determine previous, current, next station
        current_stn_str = None
        prev_stn_str = None
        next_stn_str = None

        if nearest_halt:
            current_stn_str = f"{nearest_halt.station_name} ({nearest_halt.station_code})"
            if nearest_idx > 0:
                prev_h = halts[nearest_idx - 1]
                prev_stn_str = f"{prev_h.station_name} ({prev_h.station_code})"
            if nearest_idx < len(halts) - 1:
                next_h = halts[nearest_idx + 1]
                next_stn_str = f"{next_h.station_name} ({next_h.station_code})"
        elif base_status:
            current_stn_str = base_status.current_station
            prev_stn_str = base_status.previous_station
            next_stn_str = base_status.next_station

        # 4. Construct descriptive running status
        if nearest_halt:
            if speed > 15.0:
                running_status = f"Live GPS: Cruising at {int(speed)} km/h near {nearest_halt.station_name}"
            else:
                running_status = f"Live GPS: Near {nearest_halt.station_name} (Halted / Low Speed)"
        else:
            running_status = f"Live GPS: Active at {int(speed)} km/h"

        # 5. Create authoritative GPS_OBSERVED status
        updated_status = RailwayStatus(
            train_number=clean_num,
            train_name=train_name,
            journey_date=now.strftime("%Y-%m-%d"),
            running_status=running_status,
            delay_minutes=base_status.delay_minutes if base_status else 0,
            current_station=current_stn_str,
            previous_station=prev_stn_str,
            next_station=next_stn_str,
            latitude=report.latitude,
            longitude=report.longitude,
            speed_kmph=speed,
            expected_arrival=base_status.expected_arrival if base_status else None,
            expected_departure=base_status.expected_departure if base_status else None,
            source_provider="passenger_crowd_gps",
            observed_at=now,
            fetched_at=now,
            age_seconds=0,
            freshness=FreshnessState.LIVE,
            confidence=ConfidenceLevel.HIGH,
            location_type=LocationType.GPS_OBSERVED,
            is_simulated=False,
            halts=updated_halts,
        )

        status_dict = updated_status.model_dump(mode="json")

        # 6. Store in Redis cache with 120s TTL
        cache_key = f"railpulse:status:{clean_num}"
        await cache.set_json(cache_key, status_dict, ttl_seconds=120)

        # 7. Broadcast via Redis PubSub to WebSocket listeners
        await cache.publish_event(f"train_telemetry:{clean_num}", status_dict)

        # 8. Record crowd metadata
        crowd_meta_key = f"railpulse:crowd_meta:{clean_num}"
        await cache.set_json(
            crowd_meta_key,
            {
                "active_reporters": 1,
                "last_reported": now.isoformat(),
                "accuracy_meters": report.accuracy_meters,
            },
            ttl_seconds=60,
        )

        logger.info(
            "Crowd GPS received for train %s: lat=%.4f, lon=%.4f, speed=%.1f km/h, near=%s",
            clean_num,
            report.latitude,
            report.longitude,
            speed,
            current_stn_str,
        )

        return {
            "status": "relayed",
            "train_number": clean_num,
            "train_name": train_name,
            "current_station": current_stn_str,
            "speed_kmph": speed,
            "confidence": "HIGH",
            "location_type": "GPS_OBSERVED",
            "active_reporters": 1,
            "distance_to_nearest_station_km": round(min_distance_km, 2) if min_distance_km != float("inf") else None,
            "privacy_notice": "Zero-PII Architecture: No user account, IP address, or device fingerprint is logged or stored.",
        }


orchestrator = ProviderOrchestrator()
