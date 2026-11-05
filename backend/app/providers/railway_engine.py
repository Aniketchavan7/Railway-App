import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.providers.base import ProviderUnavailable, RailwayProvider
from app.schemas.details import CoachComposition, CoachPosition, CoachType, FareClassBreakdown, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PassengerStatus, PNRStatus
from app.schemas.station import Station, StationBoardItem, StationLiveBoard
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt
from app.services.train_schedule_service import IST

logger = logging.getLogger("railpulse.providers.railway_engine")


def _format_station(val: Any) -> Optional[str]:
    if not val:
        return None
    if isinstance(val, dict):
        name = val.get("name") or val.get("stationName") or ""
        code = val.get("code") or val.get("stationCode") or ""
        if name and code:
            return f"{name} ({code})"
        return name or code or None
    return str(val)


def _station_code(val: Any) -> Optional[str]:
    if isinstance(val, dict):
        return val.get("code") or val.get("stationCode")
    return None


def _parse_dt(val: Any) -> Optional[datetime]:
    if not isinstance(val, str) or not val:
        return None
    try:
        parsed = datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=IST)


def _normalise_exceptions(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    result: List[Dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            result.append(item)
        elif item:
            result.append({"message": str(item)})
    return result


NOT_STARTED_STATES = {"NOT_STARTED", "YET_TO_START", "SCHEDULED", "RESCHEDULED"}
COMPLETED_STATES = {"COMPLETED", "TERMINATED", "REACHED", "REACHED_DESTINATION", "ARRIVED_AT_DESTINATION"}
CANCELLED_STATES = {"CANCELLED", "CANCELED", "FULLY_CANCELLED", "CANCELLATION"}
# "ARRIVED" alone means at a station along the way, not at the end of the journey.
RUNNING_STATES = {"RUNNING", "IN_TRANSIT", "EN_ROUTE", "DEPARTED", "ARRIVED", "AT_STATION", "HALTED", "DELAYED", "LATE", "ON_TIME"}


def _service_state(raw_status: Any, exceptions: List[Dict[str, Any]]) -> str:
    """Exact matches only. An unrecognised value is UNKNOWN rather than a confident guess."""
    raw = re.sub(r"[^A-Z]+", "_", str(raw_status or "").upper()).strip("_")
    # Only a whole-train cancellation counts: "cancelled between X and Y" is a notice.
    if raw in CANCELLED_STATES or any(
        re.sub(r"[^A-Z]+", "_", str(e.get("type") or "").upper()).strip("_") in CANCELLED_STATES for e in exceptions
    ):
        return "CANCELLED"
    if raw in NOT_STARTED_STATES:
        return "NOT_STARTED"
    if raw in COMPLETED_STATES:
        return "COMPLETED"
    if raw in RUNNING_STATES:
        return "RUNNING"
    return "UNKNOWN"


class RailwayEngineProvider(RailwayProvider):
    def __init__(self):
        self.base_url = settings.RAILWAY_ENGINE_BASE_URL.rstrip("/")
        self.api_key = settings.RAILWAY_ENGINE_API_KEY or getattr(settings, "RAILWAY_API_KEY", "") or ""
        self.timeout = 10.0
        self.headers = {
            "User-Agent": "RailPulse-SaaS/1.0 (Mozilla/5.0)",
            "Accept": "application/json",
        }
        if self.api_key:
            self.headers["x-api-key"] = self.api_key

    @property
    def provider_name(self) -> str:
        return "railway_engine"

    @property
    def supported_capabilities(self) -> List[str]:
        return [
            "LIVE_STATUS",
            "SCHEDULE",
            "ROUTE",
            "TRAIN_SEARCH",
            "STATION_SEARCH",
            "STATION_LIVE_BOARD",
            "COACH_COMPOSITION",
            "PLATFORM_INFO",
            "PNR_STATUS",
            "FARE_ENQUIRY",
            "HEALTH",
        ]

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}{path}"
        current_key = settings.RAILWAY_ENGINE_API_KEY or getattr(settings, "RAILWAY_API_KEY", "") or self.api_key
        req_headers = dict(self.headers)
        if current_key:
            req_headers["x-api-key"] = current_key

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=req_headers, params=params)
        except httpx.HTTPError as e:
            raise ProviderUnavailable(f"Railway Engine request failed for {path}: {e}") from e

        if res.status_code == 200:
            payload = res.json()
            return payload.get("data") if "data" in payload else payload
        # 404 and 400 are real answers: no record, or a date outside the allowed window.
        if res.status_code in (400, 404):
            return None
        raise ProviderUnavailable(f"Railway Engine returned HTTP {res.status_code} for {path}")

    async def get_live_status(
        self, train_number: str, journey_date: Optional[str] = None
    ) -> Optional[RailwayStatus]:
        params = {"date": journey_date} if journey_date else None
        data = await self._get(f"/train/{train_number}/status", params=params)
        if not data or not isinstance(data, dict):
            return None
        return self._parse_status(data, train_number, journey_date)

    def _parse_status(
        self, data: Dict[str, Any], train_number: str, journey_date: Optional[str]
    ) -> RailwayStatus:
        now = datetime.now(timezone.utc)
        now_ist = datetime.now(IST)
        pos = data.get("position") if isinstance(data.get("position"), dict) else {}
        fresh = data.get("freshness") if isinstance(data.get("freshness"), dict) else {}

        observed_at = _parse_dt(
            data.get("observed_at") or data.get("observedAt") or pos.get("observedAt")
            or fresh.get("observedAt") or data.get("updated_at") or data.get("updatedAt")
        ) or now
        age_seconds = max(0, int((now - observed_at).total_seconds()))
        if isinstance(fresh.get("ageSeconds"), (int, float)):
            age_seconds = int(fresh["ageSeconds"])

        raw_lat = data.get("latitude") if data.get("latitude") is not None else pos.get("latitude")
        raw_lng = data.get("longitude") if data.get("longitude") is not None else pos.get("longitude")
        lat = float(raw_lat) if raw_lat is not None else None
        lng = float(raw_lng) if raw_lng is not None else None

        raw_fresh = fresh.get("state") or data.get("freshness")
        fresh_name = str(raw_fresh).upper() if isinstance(raw_fresh, str) else "LIVE"
        freshness = FreshnessState[fresh_name] if fresh_name in FreshnessState.__members__ else FreshnessState.LIVE

        raw_conf = str(data.get("confidence") or "MEDIUM").upper()
        confidence = ConfidenceLevel[raw_conf] if raw_conf in ConfidenceLevel.__members__ else ConfidenceLevel.MEDIUM

        train_num = str(data.get("trainNumber") or data.get("train_number") or train_number)
        delay_val = data.get("delayMinutes") or data.get("delay_minutes") or (data.get("delay") or {}).get("minutes") or 0
        raw_speed = data.get("speedKmph") if data.get("speedKmph") is not None else data.get("speed_kmph")

        exceptions = _normalise_exceptions(data.get("exceptions"))
        service_state = _service_state(data.get("status") or data.get("running_status") or data.get("state"), exceptions)

        origin = data.get("origin") if isinstance(data.get("origin"), dict) else {}
        destination = data.get("destination") if isinstance(data.get("destination"), dict) else {}
        current = data.get("currentStation") or data.get("current_station")
        previous = data.get("previousStation") or data.get("previous_station")
        upcoming = data.get("nextStation") or data.get("next_station")
        progress = data.get("routeProgress") if isinstance(data.get("routeProgress"), dict) else {}
        eta = data.get("eta") if isinstance(data.get("eta"), dict) else {}

        delay_minutes = int(delay_val)
        next_eta = _parse_dt(eta.get("value"))
        # An ETA marked SCHEDULED is the timetable time, so it still needs the running delay.
        if next_eta and str(eta.get("source") or "").upper() == "SCHEDULED":
            next_eta = next_eta + timedelta(minutes=delay_minutes)

        return RailwayStatus(
            train_number=train_num,
            train_name=str(data.get("trainName") or data.get("train_name") or f"Train {train_num}"),
            journey_date=str(data.get("journeyDate") or data.get("journey_date") or journey_date or now_ist.strftime("%Y-%m-%d")),
            running_status="Live status unclear" if service_state == "UNKNOWN" else str(data.get("status") or data.get("running_status") or service_state),
            delay_minutes=delay_minutes,
            current_station=_format_station(current),
            previous_station=_format_station(previous),
            next_station=_format_station(upcoming),
            latitude=lat,
            longitude=lng,
            speed_kmph=float(raw_speed) if raw_speed is not None else None,
            source_provider=str(fresh.get("provider") or data.get("source") or self.provider_name),
            observed_at=observed_at,
            fetched_at=now,
            age_seconds=age_seconds,
            freshness=freshness,
            confidence=confidence,
            location_type=LocationType.GPS_OBSERVED if lat is not None and lng is not None else LocationType.STATION_OBSERVED,
            is_simulated=False,
            halts=[],
            service_state=service_state,
            origin_code=_station_code(origin),
            origin_name=origin.get("name"),
            destination_code=_station_code(destination),
            destination_name=destination.get("name"),
            previous_station_code=_station_code(previous),
            current_station_code=_station_code(current) or pos.get("stationCode"),
            next_station_code=_station_code(upcoming),
            next_eta=next_eta,
            route_progress_percent=float(progress["percent"]) if isinstance(progress.get("percent"), (int, float)) else None,
            exceptions=exceptions,
        )

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        return await self._get(f"/train/{train_number}/schedule")

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        return await self._get(f"/train/{train_number}/route")

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        data = await self._get("/trains/search", params={"q": query, "limit": 10})
        if isinstance(data, list):
            return data
        return []

    async def search_stations(self, query: str) -> List[Station]:
        data = await self._get("/stations/search", params={"q": query, "limit": 10})
        stations: List[Station] = []
        if isinstance(data, list):
            for s in data:
                stations.append(
                    Station(
                        station_code=s.get("code") or s.get("station_code", ""),
                        station_name=s.get("name") or s.get("station_name", ""),
                        state=s.get("state"),
                        zone=s.get("zone"),
                        division=s.get("division"),
                        latitude=float(s.get("latitude")) if s.get("latitude") else None,
                        longitude=float(s.get("longitude")) if s.get("longitude") else None,
                    )
                )
        return stations

    async def get_station(self, code: str) -> Optional[Station]:
        data = await self._get(f"/station/{code.upper().strip()}")
        if not data:
            return None
        return Station(
            station_code=data.get("code") or data.get("station_code", code.upper()),
            station_name=data.get("name") or data.get("station_name", code.upper()),
            state=data.get("state"),
            zone=data.get("zone"),
            division=data.get("division"),
            latitude=float(data.get("latitude")) if data.get("latitude") else None,
            longitude=float(data.get("longitude")) if data.get("longitude") else None,
        )

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        data = await self._get(f"/station/{station_code}/live", params={"hours": hours})
        if not data:
            return None

        train_list = data if isinstance(data, list) else (data.get("trains") or data.get("board") or [])
        trains = []
        for t in train_list:
            if not isinstance(t, dict):
                continue
            orig = t.get("origin")
            orig_str = orig.get("code") if isinstance(orig, dict) else str(orig or "")
            dest = t.get("destination")
            dest_str = dest.get("code") if isinstance(dest, dict) else str(dest or "")

            trains.append(
                StationBoardItem(
                    train_number=str(t.get("trainNumber") or t.get("train_number") or ""),
                    train_name=str(t.get("trainName") or t.get("train_name") or ""),
                    origin=orig_str,
                    destination=dest_str,
                    scheduled_arrival=t.get("arrival") or t.get("scheduled_arrival"),
                    expected_arrival=t.get("expectedArrival") or t.get("expected_arrival"),
                    scheduled_departure=t.get("departure") or t.get("scheduled_departure"),
                    expected_departure=t.get("expectedDeparture") or t.get("expected_departure"),
                    delay_arrival_minutes=int(t.get("delayMinutes") or t.get("delay_arrival_minutes") or 0),
                    delay_departure_minutes=int(t.get("delayMinutes") or t.get("delay_departure_minutes") or 0),
                    platform=str(t.get("platform")) if t.get("platform") is not None else None,
                    status=str(t.get("liveStatus") or t.get("status") or "SCHEDULED"),
                )
            )

        return StationLiveBoard(
            station_code=station_code.upper(),
            station_name=station_code.upper(),
            window_hours=hours,
            updated_at=datetime.now(timezone.utc),
            trains=trains,
            source_provider=self.provider_name,
            is_simulated=False,
        )

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        data = await self._get(f"/train/{train_number}/coaches", params={"blueprints": "true"})
        if not data:
            return None

        coach_list = data.get("coaches") if isinstance(data, dict) else data
        if not isinstance(coach_list, list):
            coach_list = []

        coaches: List[CoachPosition] = []
        for idx, c in enumerate(coach_list, start=1):
            if not isinstance(c, dict):
                continue
            ctype = c.get("coach_type") or c.get("coachType") or c.get("type") or "GEN"
            try:
                coach_enum = CoachType(ctype)
            except Exception:
                coach_enum = CoachType.GEN

            coaches.append(
                CoachPosition(
                    position_number=int(c.get("position") or c.get("position_number") or idx),
                    coach_code=str(c.get("coach_code") or c.get("coachCode") or c.get("code") or f"C{idx}"),
                    coach_type=coach_enum,
                    total_berths=int(c.get("total_berths") or c.get("totalBerths") or 72),
                )
            )

        name = data.get("train_name") or data.get("trainName") if isinstance(data, dict) else f"Train {train_number}"
        return CoachComposition(
            train_number=train_number,
            train_name=name,
            total_coaches=len(coaches),
            coaches=coaches,
            source_provider=self.provider_name,
            is_simulated=False,
        )

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        data = await self._get(f"/train/{train_number}/platforms")
        platforms: List[PlatformInfo] = []
        platform_list = data if isinstance(data, list) else (data.get("platforms") if isinstance(data, dict) else [])
        if isinstance(platform_list, list):
            for p in platform_list:
                if not isinstance(p, dict):
                    continue
                platforms.append(
                    PlatformInfo(
                        station_code=p.get("station_code") or p.get("stationCode") or p.get("code") or "",
                        station_name=p.get("station_name") or p.get("stationName") or p.get("name") or "",
                        train_number=train_number,
                        platform_number=str(p.get("platform") or p.get("platform_number") or p.get("platformNumber") or "1"),
                        confidence=p.get("confidence", "CONFIRMED"),
                    )
                )
        return platforms

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        data = await self._get(f"/pnr/{pnr}")
        if not data:
            return None

        passengers = []
        for idx, p in enumerate(data.get("passengers", []), start=1):
            passengers.append(
                PassengerStatus(
                    passenger_number=idx,
                    booking_status=p.get("booking_status", "CNF"),
                    current_status=p.get("current_status", "CNF"),
                    coach=p.get("coach"),
                    berth_number=p.get("berth_number"),
                    berth_type=p.get("berth_type"),
                )
            )

        return PNRStatus(
            pnr=pnr,
            train_number=data.get("train_number", ""),
            train_name=data.get("train_name", ""),
            journey_date=data.get("journey_date", ""),
            from_station=data.get("from_station", ""),
            to_station=data.get("to_station", ""),
            boarding_station=data.get("boarding_station", ""),
            reserved_up_to=data.get("reserved_up_to", ""),
            reservation_class=data.get("reservation_class", "SL"),
            quota=data.get("quota", "GN"),
            chart_status=data.get("chart_status", "CHART_NOT_PREPARED"),
            passengers=passengers,
            source_provider=self.provider_name,
            is_simulated=False,
            verification_tier="upstream_prs",
        )

    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> Optional[FareEnquiryResult]:
        data = await self._get(
            f"/train/{train_number}/fare",
            params={"source": origin, "destination": dest, "quota": quota},
        )
        if not data:
            return None

        classes = []
        for c in data.get("classes", []):
            classes.append(
                FareClassBreakdown(
                    class_code=c.get("class_code", "SL"),
                    class_name=c.get("class_name", "Sleeper"),
                    base_fare=float(c.get("base_fare", 0.0)),
                    reservation_charge=float(c.get("reservation_charge", 0.0)),
                    superfast_charge=float(c.get("superfast_charge", 0.0)),
                    gst=float(c.get("gst", 0.0)),
                    tatkal_surcharge=float(c.get("tatkal_surcharge", 0.0)),
                    total_fare=float(c.get("total_fare", 0.0)),
                )
            )

        return FareEnquiryResult(
            train_number=train_number,
            train_name=data.get("train_name", f"Train {train_number}"),
            origin_station=origin,
            destination_station=dest,
            distance_km=float(data.get("distance_km", 0.0)),
            quota=quota,
            classes=classes,
            pricing_engine="upstream_railway_engine",
            source_provider=self.provider_name,
            is_simulated=False,
        )

    async def get_health(self) -> Dict[str, Any]:
        try:
            data = await self._get("/provider/health")
        except ProviderUnavailable as e:
            return {"status": "UNAVAILABLE", "provider": self.provider_name, "error": str(e)}
        return data or {"status": "UNKNOWN", "provider": self.provider_name}
