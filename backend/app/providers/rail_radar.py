import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx
from app.config import settings
from app.providers.base import RailwayProvider
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationBoardItem, StationLiveBoard
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt

logger = logging.getLogger("railpulse.providers.rail_radar")


class RailRadarProvider(RailwayProvider):
    def __init__(self):
        self.base_url = settings.RAILRADAR_BASE_URL.rstrip("/")
        self.api_key = settings.RAILRADAR_API_KEY
        self.timeout = 6.0
        self.headers = {
            "User-Agent": "RailPulse-SaaS/1.0",
            "Accept": "application/json",
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    @property
    def provider_name(self) -> str:
        return "rail_radar"

    @property
    def supported_capabilities(self) -> List[str]:
        return [
            "LIVE_STATUS",
            "SCHEDULE",
            "ROUTE",
            "TRAIN_SEARCH",
            "STATION_SEARCH",
            "STATION_LIVE_BOARD",
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
                    logger.warning("RailRadar rate limit reached (HTTP 429)")
                elif res.status_code in (401, 403):
                    logger.warning("RailRadar auth failed or plan expired (%s)", res.status_code)
                return None
        except Exception as e:
            logger.error("RailRadar request error for %s: %s", path, e)
            return None

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        data = await self._get(f"/trains/{train_number}/running-status")
        if not data:
            return None

        now = datetime.now(timezone.utc)
        observed_time = now
        if data.get("observed_at"):
            try:
                observed_time = datetime.fromisoformat(data["observed_at"].replace("Z", "+00:00"))
            except Exception:
                pass

        age_seconds = int((now - observed_time).total_seconds()) if (now >= observed_time) else 0

        raw_lat = data.get("latitude")
        raw_lng = data.get("longitude")
        lat = float(raw_lat) if raw_lat is not None else None
        lng = float(raw_lng) if raw_lng is not None else None
        loc_type = LocationType.GPS_OBSERVED if (lat and lng) else LocationType.STATION_OBSERVED

        halts: List[StationHalt] = []
        for h in data.get("halts", []):
            halts.append(
                StationHalt(
                    station_code=h.get("code", ""),
                    station_name=h.get("name", ""),
                    arrival_time=h.get("scheduled_arrival"),
                    departure_time=h.get("scheduled_departure"),
                    actual_arrival=h.get("actual_arrival"),
                    actual_departure=h.get("actual_departure"),
                    distance_km=float(h.get("distance", 0.0)),
                    day_count=int(h.get("day", 1)),
                    platform=h.get("platform"),
                    delay_minutes=int(h.get("delay", 0)),
                    has_arrived=bool(h.get("arrived", False)),
                    has_departed=bool(h.get("departed", False)),
                )
            )

        return RailwayStatus(
            train_number=str(data.get("train_number") or train_number),
            train_name=str(data.get("train_name", f"Train {train_number}")),
            journey_date=str(data.get("journey_date") or now.strftime("%Y-%m-%d")),
            running_status=str(data.get("status", "RUNNING")),
            delay_minutes=int(data.get("delay_minutes", 0)),
            current_station=data.get("current_station"),
            previous_station=data.get("previous_station"),
            next_station=data.get("next_station"),
            latitude=lat,
            longitude=lng,
            speed_kmph=float(data.get("speed")) if data.get("speed") is not None else None,
            source_provider=self.provider_name,
            observed_at=observed_time,
            fetched_at=now,
            age_seconds=age_seconds,
            freshness=FreshnessState.LIVE if age_seconds < 180 else FreshnessState.RECENT,
            confidence=ConfidenceLevel.HIGH if loc_type == LocationType.GPS_OBSERVED else ConfidenceLevel.MEDIUM,
            location_type=loc_type,
            is_simulated=False,
            halts=halts,
        )

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        return await self._get(f"/trains/{train_number}/schedule")

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        return await self._get(f"/trains/{train_number}/route")

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        data = await self._get(f"/lookup/trains", params={"query": query})
        return data if isinstance(data, list) else []

    async def search_stations(self, query: str) -> List[Station]:
        data = await self._get(f"/lookup/stations", params={"query": query})
        stations = []
        if isinstance(data, list):
            for s in data:
                stations.append(
                    Station(
                        station_code=s.get("code", ""),
                        station_name=s.get("name", ""),
                        state=s.get("state"),
                        zone=s.get("zone"),
                        latitude=float(s.get("lat")) if s.get("lat") else None,
                        longitude=float(s.get("lng")) if s.get("lng") else None,
                    )
                )
        return stations

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        data = await self._get(f"/stations/{station_code}/live-board", params={"window": hours})
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
                    scheduled_arrival=t.get("sch_arr"),
                    expected_arrival=t.get("exp_arr"),
                    scheduled_departure=t.get("sch_dep"),
                    expected_departure=t.get("exp_dep"),
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
        return None  # RailRadar free sandbox does not support coach composition

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        return []

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        return None  # RailRadar paid commercial only

    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> Optional[FareEnquiryResult]:
        return None  # RailRadar paid commercial only

    async def get_health(self) -> Dict[str, Any]:
        data = await self._get("/health")
        return data or {"status": "UNKNOWN", "provider": self.provider_name}
