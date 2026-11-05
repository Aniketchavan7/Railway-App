import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.cache.redis_client import cache
from app.providers.registry import registry
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationLiveBoard
from app.schemas.status import FreshnessState, PassengerTelemetryReport, RailwayStatus, StationHalt
from app.services import crowd_service
from app.services.fare_engine import TelescopicFareEngine
from app.services.journey_resolver import format_day, next_run_date, resolve_journey
from app.services.position_service import apply_position, mark_progress
from app.services.reference_lookup import STATION_INDEX, halts_from_schedule, reference_halts, station_coords, station_name
from app.services.train_schedule_service import TrainOperationsMetadata

logger = logging.getLogger("railpulse.services.orchestrator")

RECENT_AFTER_SECONDS = 180
STALE_AFTER_SECONDS = 600
SCHEDULE_RETRY_SECONDS = 300
STATION_RETRY_SECONDS = 300
ROUTE_RETRY_SECONDS = 300

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
    "11027": "Dadar Solapur Express",
    "11028": "Solapur Dadar Express",
    "12809": "Mumbai Howrah Mail",
    "12810": "Howrah Mumbai Mail",
    "11301": "Udyan Express",
    "11302": "Udyan Express",
    "12627": "Karnataka Express",
    "12628": "Karnataka Express",
    "12953": "August Kranti Tejas Rajdhani Express",
    "12954": "August Kranti Tejas Rajdhani Express",
    "20901": "Gandhinagar Capital Vande Bharat",
    "20902": "Gandhinagar Mumbai Vande Bharat",
    "12621": "Tamil Nadu Express",
    "12622": "Tamil Nadu Express",
    "20607": "Chennai Mysuru Vande Bharat Express",
    "20608": "Mysuru Chennai Vande Bharat Express",
}


class LiveDataUnavailable(Exception):
    """No provider could be asked and we have nothing truthful to show."""


def _has_usable_route(route: Dict[str, Any]) -> bool:
    return isinstance(route.get("coordinates"), list) and len(route["coordinates"]) > 1


def _search_known_trains(query: str) -> List[Dict[str, Any]]:
    q = query.lower().strip()
    results = []
    for number, name in KNOWN_TRAINS.items():
        if q in number or q in name.lower():
            profile = TrainOperationsMetadata.get_profile(number) or {}
            results.append({
                "train_number": number,
                "train_name": name,
                "origin": profile.get("origin"),
                "destination": profile.get("destination"),
            })
    return results[:10]


def _search_known_stations(query: str) -> List[Station]:
    q = query.lower().strip()
    return [
        Station(
            station_code=s["code"],
            station_name=s["name"],
            state=s.get("state"),
            zone=s.get("zone"),
            latitude=s["lat"],
            longitude=s["lng"],
        )
        for s in STATION_INDEX.values()
        if q in s["code"].lower() or q in s["name"].lower()
    ][:10]


def _codes_from_halts(status: RailwayStatus) -> None:
    """Providers that give station names as text still mark which stops are done."""
    reached = [h for h in status.halts if h.has_arrived]
    upcoming = [h for h in status.halts if not h.has_arrived]
    if reached and not status.current_station_code:
        status.current_station_code = reached[-1].station_code
    if upcoming and not status.next_station_code:
        status.next_station_code = upcoming[0].station_code


def clean_train_name(name: Optional[str] = None, train_number: Optional[str] = None) -> str:
    clean_num = train_number.strip() if train_number else ""
    if not clean_num and name and name.strip().isdigit():
        clean_num = name.strip()

    if clean_num and clean_num in KNOWN_TRAINS:
        return KNOWN_TRAINS[clean_num]

    if not name or (clean_num and name.strip() == f"Express {clean_num}"):
        return KNOWN_TRAINS.get(clean_num, f"Express {clean_num}" if clean_num else "")

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


class ProviderOrchestrator:
    """
    Capability-Aware Provider Orchestrator.
    Routes queries per capability across verified providers with circuit breakers,
    Redis caching, distributed deduplication, and honest data freshness tagging.
    """

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        """The one source of truth for a train, used by REST, WebSockets and the assistant.

        Returns None when no such train is known. Raises LiveDataUnavailable when we
        could not find out, so callers never present an outage as "not found".
        """
        status = await self._build_status(train_number)
        if status is None:
            return None
        return await crowd_service.apply_overlay(status)

    async def _build_status(self, train_number: str) -> Optional[RailwayStatus]:
        """Everything except passenger GPS, recomputed per read so position and age stay current."""
        clean_num = str(train_number).strip()
        now = datetime.now(timezone.utc)
        resolution = await resolve_journey(clean_num, now)
        status = resolution.status
        if status is None:
            if resolution.provider_answered:
                return None
            raise LiveDataUnavailable(clean_num)

        status.train_name = clean_train_name(status.train_name, clean_num)
        self._apply_timetable_facts(status, clean_num, now)

        if status.is_simulated:
            pass
        elif any(h.has_arrived for h in status.halts):
            # This provider reported stop-by-stop progress, which beats working it out.
            await self._fill_halt_coords(status.halts)
            _codes_from_halts(status)
        else:
            status.halts = await self._timetable_halts(clean_num)
            mark_progress(status)
        status = await apply_position(status, self._station_coords, now)
        return self._apply_age(status, now)

    def _apply_timetable_facts(self, status: RailwayStatus, train_number: str, now: datetime) -> None:
        profile = TrainOperationsMetadata.get_profile(train_number)
        if profile:
            status.days_of_run = status.days_of_run or profile.get("days_of_run", [])
            status.pairing_train_number = status.pairing_train_number or profile.get("pairing_train")
            status.origin_code = status.origin_code or profile.get("origin")
            status.origin_name = status.origin_name or profile.get("origin_name")
            status.destination_code = status.destination_code or profile.get("destination")
            status.destination_name = status.destination_name or profile.get("destination_name")
        status.journey_date_label = format_day(status.journey_date)
        if status.service_state in ("NOT_RUNNING_TODAY", "COMPLETED", "CANCELLED", "UNKNOWN"):
            status.next_run_date = next_run_date(train_number, now)

    def _apply_age(self, status: RailwayStatus, now: datetime) -> RailwayStatus:
        status.age_seconds = max(0, int((now - status.observed_at).total_seconds()))
        # A cached "LIVE" must not stay LIVE forever, and UNKNOWN or STALE are set on purpose.
        if status.freshness in (FreshnessState.LIVE, FreshnessState.RECENT):
            if status.age_seconds > STALE_AFTER_SECONDS:
                status.freshness = FreshnessState.STALE
            elif status.age_seconds > RECENT_AFTER_SECONDS:
                status.freshness = FreshnessState.RECENT
        return status

    async def _timetable_halts(self, train_number: str) -> List[StationHalt]:
        schedule = await self.get_schedule(train_number)
        halts = halts_from_schedule(schedule) if schedule and not schedule.get("is_simulated") else []
        if not halts:
            halts = reference_halts(train_number)
        await self._fill_halt_coords(halts)
        return halts

    async def _fill_halt_coords(self, halts: List[StationHalt]) -> None:
        for halt in halts:
            if halt.latitude is None or halt.longitude is None:
                cached = await self._cached_station_coords(halt.station_code)
                if cached:
                    halt.latitude, halt.longitude = cached

    async def _cached_station_coords(self, code: Optional[str]) -> Optional[Tuple[float, float]]:
        """Coordinates without spending provider quota, safe to call for every stop."""
        local = station_coords(code)
        if local or not code:
            return local
        cached = await cache.get_json(f"railpulse:station:{code.upper()}")
        if cached and cached.get("latitude") is not None and cached.get("longitude") is not None:
            return (cached["latitude"], cached["longitude"])
        return None

    async def _station_coords(self, code: Optional[str]) -> Optional[Tuple[float, float]]:
        """Coordinates for the stations a train is between, asking the provider if needed."""
        known = await self._cached_station_coords(code)
        if known or not code:
            return known
        station = await self.get_station(code)
        if station and station.latitude is not None and station.longitude is not None:
            return (station.latitude, station.longitude)
        return None

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        cache_key = f"railpulse:schedule:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached is not None:
            return None if cached.get("no_record") else cached

        for p in registry.get_providers_for_capability("SCHEDULE"):
            try:
                res = await p.get_schedule(train_number)
                if isinstance(res, list):
                    res = {"train_number": train_number, "halts": res}
                if res:
                    await cache.set_json(cache_key, res, ttl_seconds=12 * 3600)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_schedule: %s", p.provider_name, e)
        await cache.set_json(cache_key, {"no_record": True}, ttl_seconds=SCHEDULE_RETRY_SECONDS)
        return None

    async def get_timetable(self, train_number: str) -> Optional[Dict[str, Any]]:
        """The provider's schedule, or the bundled timetable when it can't be reached."""
        schedule = await self.get_schedule(train_number)
        if schedule:
            return schedule
        halts = reference_halts(train_number)
        if not halts:
            return None
        return {
            "train_number": train_number,
            "train_name": KNOWN_TRAINS.get(train_number),
            "days_of_run": (TrainOperationsMetadata.get_profile(train_number) or {}).get("days_of_run", []),
            "halts": [h.model_dump(include={"station_code", "station_name", "arrival_time", "departure_time", "distance_km", "platform"}) for h in halts],
            "is_simulated": False,
            "source_provider": "reference_timetable",
        }

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        cache_key = f"railpulse:route:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached and str(cached.get("train_number")) == str(train_number):
            return cached

        for p in registry.get_providers_for_capability("ROUTE"):
            try:
                res = await p.get_route(train_number)
                if res and _has_usable_route(res):
                    await cache.set_json(cache_key, res, ttl_seconds=12 * 3600)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_route: %s", p.provider_name, e)

        # Joining known stops gives a usable line. It is not the real track shape.
        halts = await self._timetable_halts(train_number)
        coordinates = [[h.longitude, h.latitude] for h in halts if h.latitude is not None and h.longitude is not None]
        if len(coordinates) < 2:
            return None
        route = {
            "train_number": train_number,
            "type": "LineString",
            "coordinates": coordinates,
            "is_simulated": False,
            "source_provider": "reference_timetable",
        }
        # Short-lived, because the provider's real route may be available next time.
        await cache.set_json(cache_key, route, ttl_seconds=ROUTE_RETRY_SECONDS)
        return route

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        cache_key = f"railpulse:search_trains:{query.lower()}"
        cached = await cache.get_json(cache_key)
        if cached and isinstance(cached, list):
            return cached

        providers = registry.get_providers_for_capability("TRAIN_SEARCH")
        for p in providers:
            try:
                res = await p.search_trains(query)
                if res:
                    await cache.set_json(cache_key, res, ttl_seconds=3600)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on search_trains: %s", p.provider_name, e)
        return _search_known_trains(query)

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
                    await cache.set_json(cache_key, [s.model_dump() for s in res], ttl_seconds=86400)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on search_stations: %s", p.provider_name, e)
        return _search_known_stations(query)

    async def get_station(self, code: str) -> Optional[Station]:
        clean = code.upper().strip()
        local = STATION_INDEX.get(clean)
        if local:
            return Station(
                station_code=local["code"],
                station_name=local["name"],
                state=local.get("state"),
                zone=local.get("zone"),
                latitude=local["lat"],
                longitude=local["lng"],
            )

        cache_key = f"railpulse:station:{clean}"
        cached = await cache.get_json(cache_key)
        if cached:
            if cached.get("no_record"):
                return None
            try:
                return Station(**cached)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("STATION_SEARCH")
        if not providers:
            return None  # Every breaker is open, so this says nothing about the station.
        for p in providers:
            try:
                res = await p.get_station(clean)
                if res:
                    await cache.set_json(cache_key, res.model_dump(), ttl_seconds=86400 * 7)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_station: %s", p.provider_name, e)
                # Not a real miss, so retry after a while, but not on every 5-second tick.
                await cache.set_json(cache_key, {"no_record": True}, ttl_seconds=STATION_RETRY_SECONDS)
                return None

        await cache.set_json(cache_key, {"no_record": True}, ttl_seconds=86400)
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
                    res.station_name = station_name(code) or res.station_name
                    for item in res.trains:
                        item.train_name = KNOWN_TRAINS.get(item.train_number, item.train_name)
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=60)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_station_board: %s", p.provider_name, e)
        return None

    def _enrich_coach_platform_metadata(self, comp: CoachComposition) -> CoachComposition:
        total = len(comp.coaches)
        comp.total_length_meters = total * 24
        for idx, c in enumerate(comp.coaches, start=1):
            if c.platform_pole_number is None:
                c.platform_pole_number = idx
            if c.distance_from_engine_m is None:
                c.distance_from_engine_m = (idx - 1) * 24
            if not c.nearest_fob:
                if idx <= max(1, int(total * 0.3)):
                    c.nearest_fob = "FOB 1 (Rear Station Bridge)"
                elif idx <= max(2, int(total * 0.7)):
                    c.nearest_fob = "FOB 2 (Central Concourse Bridge)"
                else:
                    c.nearest_fob = "FOB 3 (Front Exit Ramp / Gate)"
        return comp

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        cache_key = f"railpulse:coaches:{train_number}"
        cached = await cache.get_json(cache_key)
        if cached:
            try:
                if str(cached.get("train_number")) == str(train_number):
                    comp = CoachComposition(**cached)
                    return self._enrich_coach_platform_metadata(comp)
            except Exception:
                pass

        providers = registry.get_providers_for_capability("COACH_COMPOSITION")
        for p in providers:
            try:
                res = await p.get_coach_composition(train_number)
                if res:
                    enriched = self._enrich_coach_platform_metadata(res)
                    await cache.set_json(cache_key, enriched.model_dump(mode="json"), ttl_seconds=12 * 3600)
                    return enriched
            except Exception as e:
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
                    await cache.set_json(cache_key, [item.model_dump() for item in res], ttl_seconds=3600)
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_platform_info: %s", p.provider_name, e)
        return []

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        # PNR is NEVER cached to strictly respect passenger privacy!
        providers = registry.get_providers_for_capability("PNR_STATUS")
        answered = False
        for p in providers:
            try:
                res = await p.get_pnr_status(pnr)
                answered = True
                if res:
                    return res
            except Exception as e:
                logger.warning("Provider %s error on get_pnr_status: %s", p.provider_name, e)
        # "We couldn't check" must not read as "your booking doesn't exist".
        if not answered:
            raise LiveDataUnavailable(pnr)
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
                    await cache.set_json(cache_key, res.model_dump(mode="json"), ttl_seconds=86400)
                    return res
            except Exception:
                pass

        # Fallback to verified Railway Board Telescopic Distance Tariff formula
        canonical_name = clean_train_name(train_number=train_number)
        fare_result = TelescopicFareEngine.calculate_all_classes(
            train_number=train_number,
            train_name=canonical_name or f"Express {train_number}",
            origin=origin,
            destination=dest,
            quota=quota,
        )
        if hasattr(fare_result, "total_distance_km") and fare_result.total_distance_km is None:
            fare_result.total_distance_km = fare_result.distance_km
        await cache.set_json(cache_key, fare_result.model_dump(mode="json"), ttl_seconds=86400)
        return fare_result

    async def report_passenger_telemetry(
        self, train_number: str, report: PassengerTelemetryReport
    ) -> Dict[str, Any]:
        """Check one passenger GPS report and, if it counts, share the result with watchers."""
        clean_num = train_number.strip()
        base = await self._build_status(clean_num)
        if base is None:
            return {"status": "rejected", "reason": "unknown_train", "message": "We could not find this train.", "active_reporters": 0}

        result = await crowd_service.ingest(report, base)
        if result.status == "accepted":
            updated = await crowd_service.apply_overlay(base)
            await cache.publish_event(f"train_telemetry:{clean_num}", updated.model_dump(mode="json"))
        return {
            "status": result.status,
            "reason": result.reason,
            "message": result.message,
            "active_reporters": result.active_reporters,
        }


orchestrator = ProviderOrchestrator()
