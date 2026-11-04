import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.providers.base import RailwayProvider
from app.schemas.details import CoachComposition, CoachPosition, CoachType, FareClassBreakdown, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PassengerStatus, PNRStatus
from app.schemas.station import Station, StationBoardItem, StationLiveBoard
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt
from app.services.train_schedule_service import TrainOperationsMetadata, IST

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
                if res.status_code == 200:
                    payload = res.json()
                    return payload.get("data") if "data" in payload else payload
                elif res.status_code == 429:
                    logger.warning("Railway Engine rate limit reached (HTTP 429)")
                elif res.status_code in (401, 403):
                    logger.warning("Railway Engine authentication required/forbidden (%s)", res.status_code)
                else:
                    logger.info("Railway Engine returned HTTP %s for %s", res.status_code, path)
                return None
        except Exception as e:
            logger.error("Railway Engine request failed for %s: %s", path, e)
            return None

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        now = datetime.now(timezone.utc)
        now_ist = datetime.now(IST)
        op_check = TrainOperationsMetadata.check_operational_status(train_number, now)
        profile = TrainOperationsMetadata.get_profile(train_number)

        data = await self._get(f"/train/{train_number}/status")
        if not data or not isinstance(data, dict):
            # If upstream returned None (e.g. 404 because train is not operating today)
            if not op_check.get("runs_today", True):
                origin_name = profile["origin_name"] if profile else "Origin Station"
                return RailwayStatus(
                    train_number=str(train_number),
                    train_name=profile["name"] if profile else f"Train {train_number}",
                    journey_date=now_ist.strftime("%Y-%m-%d"),
                    running_status=op_check["running_status"],
                    delay_minutes=0,
                    current_station=f"{origin_name} (Depot / Non-Operating Day)",
                    previous_station=None,
                    next_station=None,
                    latitude=None,
                    longitude=None,
                    speed_kmph=0.0,
                    source_provider=self.provider_name,
                    observed_at=now,
                    fetched_at=now,
                    age_seconds=0,
                    freshness=FreshnessState.LIVE,
                    confidence=ConfidenceLevel.HIGH,
                    location_type=LocationType.STATION_OBSERVED,
                    is_simulated=False,
                    halts=[],
                    runs_today=False,
                    days_of_run=op_check["days_of_run"],
                    service_state="NOT_RUNNING_TODAY",
                    service_notice=op_check["service_notice"],
                    pairing_train_number=op_check.get("pairing_train"),
                )
            return None
        observed_time_str = (
            data.get("observed_at")
            or data.get("observedAt")
            or data.get("updated_at")
            or data.get("updatedAt")
        )
        observed_at = now
        if observed_time_str and isinstance(observed_time_str, str):
            try:
                observed_at = datetime.fromisoformat(observed_time_str.replace("Z", "+00:00"))
            except Exception:
                pass

        age_seconds = int((now - observed_at).total_seconds()) if (now >= observed_at) else 0

        # Location classification
        pos = data.get("position") if isinstance(data.get("position"), dict) else {}
        raw_lat = data.get("latitude") if data.get("latitude") is not None else pos.get("latitude")
        raw_lng = data.get("longitude") if data.get("longitude") is not None else pos.get("longitude")
        lat = float(raw_lat) if raw_lat is not None else None
        lng = float(raw_lng) if raw_lng is not None else None

        loc_type = LocationType.STATION_OBSERVED
        if lat is not None and lng is not None:
            loc_type = LocationType.GPS_OBSERVED

        # Freshness parsing (handles string or dict {"state": "LIVE", ...})
        raw_fresh = data.get("freshness")
        raw_freshness_str = "LIVE"
        if isinstance(raw_fresh, dict):
            raw_freshness_str = str(raw_fresh.get("state") or raw_fresh.get("freshness") or "LIVE").upper()
            if "ageSeconds" in raw_fresh and isinstance(raw_fresh["ageSeconds"], (int, float)):
                age_seconds = int(raw_fresh["ageSeconds"])
        elif isinstance(raw_fresh, str):
            raw_freshness_str = raw_fresh.upper()

        freshness = FreshnessState[raw_freshness_str] if raw_freshness_str in FreshnessState.__members__ else FreshnessState.LIVE

        raw_conf = str(data.get("confidence") or "HIGH").upper()
        confidence = ConfidenceLevel[raw_conf] if raw_conf in ConfidenceLevel.__members__ else ConfidenceLevel.HIGH

        # Halts extraction
        raw_halts = data.get("halts") or data.get("schedule") or data.get("stops") or []
        halts: List[StationHalt] = []
        if isinstance(raw_halts, list):
            for h in raw_halts:
                if not isinstance(h, dict):
                    continue
                stn = h.get("station") if isinstance(h.get("station"), dict) else {}
                code = h.get("station_code") or h.get("stationCode") or h.get("code") or stn.get("code") or ""
                name = h.get("station_name") or h.get("stationName") or h.get("name") or stn.get("name") or ""
                dist = h.get("distance_km") or h.get("distanceKm") or h.get("distance") or 0.0

                halts.append(
                    StationHalt(
                        station_code=str(code),
                        station_name=str(name),
                        arrival_time=h.get("arrival_time") or h.get("arrivalTime") or h.get("arrival"),
                        departure_time=h.get("departure_time") or h.get("departureTime") or h.get("departure"),
                        actual_arrival=h.get("actual_arrival") or h.get("actualArrival"),
                        actual_departure=h.get("actual_departure") or h.get("actualDeparture"),
                        distance_km=float(dist),
                        day_count=int(h.get("day") or h.get("day_count") or 1),
                        platform=str(h.get("platform")) if h.get("platform") is not None else None,
                        delay_minutes=int(h.get("delay_minutes") or h.get("delayMinutes") or 0),
                        has_arrived=bool(h.get("has_arrived") or h.get("hasArrived") or False),
                        has_departed=bool(h.get("has_departed") or h.get("hasDeparted") or False),
                        latitude=float(h.get("lat") or h.get("latitude")) if (h.get("lat") or h.get("latitude")) else None,
                        longitude=float(h.get("lng") or h.get("longitude")) if (h.get("lng") or h.get("longitude")) else None,
                    )
                )

        train_num = str(data.get("trainNumber") or data.get("train_number") or train_number)
        train_name = str(data.get("trainName") or data.get("train_name") or f"Train {train_num}")
        journey_date = str(data.get("journeyDate") or data.get("journey_date") or now_ist.strftime("%Y-%m-%d"))

        raw_speed = data.get("speedKmph") if data.get("speedKmph") is not None else data.get("speed_kmph")
        speed_kmph = float(raw_speed) if raw_speed is not None else None

        delay_val = data.get("delayMinutes") or data.get("delay_minutes") or (data.get("delay") or {}).get("minutes") or 0
        delay_minutes = int(delay_val)

        current_stn = _format_station(data.get("currentStation") or data.get("current_station"))
        previous_stn = _format_station(data.get("previousStation") or data.get("previous_station"))
        next_stn = _format_station(data.get("nextStation") or data.get("next_station"))

        # Determine authentic service state (NOT_STARTED, COMPLETED, RUNNING)
        raw_status = str(data.get("status") or data.get("running_status") or data.get("state") or "RUNNING").upper()
        service_state = "RUNNING"
        service_notice = op_check.get("service_notice")

        if "NOT_STARTED" in raw_status or (op_check.get("service_state") == "NOT_STARTED" and (speed_kmph is None or speed_kmph == 0)):
            service_state = "NOT_STARTED"
            speed_kmph = 0.0
            if profile and profile.get("dep_time"):
                running_status = f"Scheduled to Depart {profile['origin_name']} at {profile['dep_time']} IST"
            else:
                running_status = "Scheduled — Not Started Yet"
            service_notice = op_check.get("service_notice") or f"Train {train_num} has not departed yet today."
        elif "COMPLETED" in raw_status or "TERMINATED" in raw_status or "ARRIVED" in raw_status or (op_check.get("service_state") == "COMPLETED" and (speed_kmph is None or speed_kmph == 0)):
            service_state = "COMPLETED"
            speed_kmph = 0.0
            if profile and profile.get("arr_time"):
                running_status = f"Journey Completed at {profile['destination_name']} ({profile['arr_time']} IST)"
            else:
                running_status = "Journey Completed (Terminated)"
            service_notice = op_check.get("service_notice") or f"Train {train_num} has reached its final destination."
        else:
            service_state = "RUNNING"
            running_status = str(data.get("status") or data.get("running_status") or "RUNNING")

        return RailwayStatus(
            train_number=train_num,
            train_name=train_name,
            journey_date=journey_date,
            running_status=running_status,
            delay_minutes=delay_minutes,
            current_station=current_stn,
            previous_station=previous_stn,
            next_station=next_stn,
            latitude=lat,
            longitude=lng,
            speed_kmph=speed_kmph,
            source_provider=self.provider_name,
            observed_at=observed_at,
            fetched_at=now,
            age_seconds=age_seconds,
            freshness=freshness,
            confidence=confidence,
            location_type=loc_type,
            is_simulated=False,
            halts=halts,
            runs_today=op_check.get("runs_today", True),
            days_of_run=op_check.get("days_of_run", ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
            service_state=service_state,
            service_notice=service_notice,
            pairing_train_number=op_check.get("pairing_train"),
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
        data = await self._get("/provider/health")
        return data or {"status": "UNKNOWN", "provider": self.provider_name}
