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

logger = logging.getLogger("railpulse.providers.railway_engine")


class RailwayEngineProvider(RailwayProvider):
    def __init__(self):
        self.base_url = settings.RAILWAY_ENGINE_BASE_URL.rstrip("/")
        self.api_key = settings.RAILWAY_ENGINE_API_KEY
        self.timeout = 6.0
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
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(url, headers=self.headers, params=params)
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
        data = await self._get(f"/train/{train_number}/status")
        if not data:
            return None

        now = datetime.now(timezone.utc)
        observed_time_str = data.get("observed_at") or data.get("updated_at")
        observed_at = now
        if observed_time_str:
            try:
                observed_at = datetime.fromisoformat(observed_time_str.replace("Z", "+00:00"))
            except Exception:
                pass

        age_seconds = int((now - observed_at).total_seconds()) if (now >= observed_at) else 0

        # Location classification
        raw_lat = data.get("latitude")
        raw_lng = data.get("longitude")
        lat = float(raw_lat) if raw_lat is not None else None
        lng = float(raw_lng) if raw_lng is not None else None

        loc_type = LocationType.STATION_OBSERVED
        if lat is not None and lng is not None:
            loc_type = LocationType.GPS_OBSERVED

        raw_freshness = (data.get("freshness") or "LIVE").upper()
        freshness = FreshnessState.LIVE
        if raw_freshness in FreshnessState.__members__:
            freshness = FreshnessState[raw_freshness]

        raw_conf = (data.get("confidence") or "HIGH").upper()
        confidence = ConfidenceLevel.HIGH
        if raw_conf in ConfidenceLevel.__members__:
            confidence = ConfidenceLevel[raw_conf]

        halts: List[StationHalt] = []
        for h in data.get("halts", []):
            halts.append(
                StationHalt(
                    station_code=h.get("station_code") or h.get("code", ""),
                    station_name=h.get("station_name") or h.get("name", ""),
                    arrival_time=h.get("arrival_time"),
                    departure_time=h.get("departure_time"),
                    actual_arrival=h.get("actual_arrival"),
                    actual_departure=h.get("actual_departure"),
                    distance_km=float(h.get("distance_km", 0.0)),
                    day_count=int(h.get("day", 1)),
                    platform=h.get("platform"),
                    delay_minutes=int(h.get("delay_minutes", 0)),
                    has_arrived=bool(h.get("has_arrived", False)),
                    has_departed=bool(h.get("has_departed", False)),
                    latitude=h.get("lat") or h.get("latitude"),
                    longitude=h.get("lng") or h.get("longitude"),
                )
            )

        return RailwayStatus(
            train_number=str(data.get("train_number") or train_number),
            train_name=str(data.get("train_name", f"Train {train_number}")),
            journey_date=str(data.get("journey_date") or now.strftime("%Y-%m-%d")),
            running_status=str(data.get("running_status") or data.get("state", "RUNNING")),
            delay_minutes=int(data.get("delay_minutes", 0)),
            current_station=data.get("current_station"),
            previous_station=data.get("previous_station"),
            next_station=data.get("next_station"),
            latitude=lat,
            longitude=lng,
            speed_kmph=float(data.get("speed_kmph")) if data.get("speed_kmph") is not None else None,
            source_provider=self.provider_name,
            observed_at=observed_at,
            fetched_at=now,
            age_seconds=age_seconds,
            freshness=freshness,
            confidence=confidence,
            location_type=loc_type,
            is_simulated=False,
            halts=halts,
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

        trains = []
        for t in data.get("trains", []):
            trains.append(
                StationBoardItem(
                    train_number=t.get("train_number", ""),
                    train_name=t.get("train_name", ""),
                    origin=t.get("origin", ""),
                    destination=t.get("destination", ""),
                    scheduled_arrival=t.get("scheduled_arrival"),
                    expected_arrival=t.get("expected_arrival"),
                    scheduled_departure=t.get("scheduled_departure"),
                    expected_departure=t.get("expected_departure"),
                    delay_arrival_minutes=int(t.get("delay_arrival_minutes", 0)),
                    delay_departure_minutes=int(t.get("delay_departure_minutes", 0)),
                    platform=t.get("platform"),
                    status=t.get("status", "SCHEDULED"),
                )
            )

        return StationLiveBoard(
            station_code=station_code.upper(),
            station_name=data.get("station_name", station_code.upper()),
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

        coaches: List[CoachPosition] = []
        for c in data.get("coaches", []):
            coaches.append(
                CoachPosition(
                    position_number=int(c.get("position", 1)),
                    coach_code=c.get("coach_code", "GEN"),
                    coach_type=CoachType(c.get("coach_type", "GEN")),
                    total_berths=int(c.get("total_berths", 72)),
                )
            )

        return CoachComposition(
            train_number=train_number,
            train_name=data.get("train_name", f"Train {train_number}"),
            total_coaches=len(coaches),
            coaches=coaches,
            source_provider=self.provider_name,
            is_simulated=False,
        )

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        data = await self._get(f"/train/{train_number}/platforms")
        platforms: List[PlatformInfo] = []
        if isinstance(data, list):
            for p in data:
                platforms.append(
                    PlatformInfo(
                        station_code=p.get("station_code", ""),
                        station_name=p.get("station_name", ""),
                        train_number=train_number,
                        platform_number=p.get("platform"),
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
