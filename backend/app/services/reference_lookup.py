"""Read-only lookups over the bundled timetable reference data.

This data is real timetable reference, not simulation, so it stays available when
the simulator is off. It only supplies stops, station coordinates and distances.
It never says where a train is right now.
"""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from app.providers.simulator import REFERENCE_STATIONS, REFERENCE_TRAINS
from app.schemas.status import StationHalt
from app.services.train_schedule_service import TrainOperationsMetadata


def _build_station_index() -> Dict[str, Dict[str, Any]]:
    index: Dict[str, Dict[str, Any]] = {}
    # Broad open dataset first, so that the curated records below override it.
    bundled = json.loads((Path(__file__).parent.parent / "data" / "stations.json").read_text(encoding="utf-8"))
    for code, (lat, lng, name) in bundled.items():
        index[code] = {"code": code, "name": name, "lat": lat, "lng": lng}
    for train in REFERENCE_TRAINS.values():
        for h in train.get("halts", []):
            if h.get("lat") is not None and h.get("lng") is not None:
                index[h["code"].upper()] = {"code": h["code"], "name": h["name"], "lat": h["lat"], "lng": h["lng"]}
    # Curated station records win over the names used inside individual trains.
    for s in REFERENCE_STATIONS:
        index[s["code"].upper()] = s
    return index


STATION_INDEX = _build_station_index()


def station_coords(code: Optional[str]) -> Optional[Tuple[float, float]]:
    if not code:
        return None
    station = STATION_INDEX.get(code.upper())
    return (station["lat"], station["lng"]) if station else None


def station_name(code: Optional[str]) -> Optional[str]:
    if not code:
        return None
    station = STATION_INDEX.get(code.upper())
    return station["name"] if station else None


def reference_halts(train_number: str) -> List[StationHalt]:
    """Stops from bundled data, or just origin and destination for profile-only trains."""
    train = REFERENCE_TRAINS.get(str(train_number))
    if train:
        return [_halt_from_reference(h) for h in train.get("halts", [])]

    profile = TrainOperationsMetadata.get_profile(train_number)
    if not profile:
        return []
    halts = []
    for code, name, arr, dep in (
        (profile.get("origin"), profile.get("origin_name"), None, profile.get("dep_time")),
        (profile.get("destination"), profile.get("destination_name"), profile.get("arr_time"), None),
    ):
        if not code:
            continue
        coords = station_coords(code)
        halts.append(
            StationHalt(
                station_code=code,
                station_name=name or code,
                arrival_time=arr,
                departure_time=dep,
                latitude=coords[0] if coords else None,
                longitude=coords[1] if coords else None,
            )
        )
    return halts


def _halt_from_reference(h: Dict[str, Any]) -> StationHalt:
    return StationHalt(
        station_code=h["code"],
        station_name=h["name"],
        arrival_time=h.get("sch_arr"),
        departure_time=h.get("sch_dep"),
        distance_km=float(h.get("dist") or 0.0),
        platform=h.get("platform"),
        latitude=h.get("lat"),
        longitude=h.get("lng"),
    )


def halts_from_schedule(schedule: Optional[Dict[str, Any]]) -> List[StationHalt]:
    """Normalise a provider schedule, tolerating the field names providers use."""
    if not isinstance(schedule, dict):
        return []
    stops = next(
        (schedule[k] for k in ("halts", "stops", "schedule", "route", "stations") if isinstance(schedule.get(k), list)),
        [],
    )
    halts: List[StationHalt] = []
    for stop in stops:
        if not isinstance(stop, dict):
            continue
        try:
            station = stop.get("station") if isinstance(stop.get("station"), dict) else {}
            code = stop.get("code") or stop.get("station_code") or stop.get("stationCode") or station.get("code")
            if not code:
                continue
            lat = _first(stop, "lat", "latitude") or station.get("latitude") or station.get("lat")
            lng = _first(stop, "lng", "longitude") or station.get("longitude") or station.get("lng")
            coords = station_coords(code)
            platform = _first(stop, "platform", "platformNumber")
            halts.append(
                StationHalt(
                    station_code=str(code),
                    station_name=str(stop.get("name") or stop.get("station_name") or stop.get("stationName") or station.get("name") or code),
                    arrival_time=_clock(_first(stop, "sch_arr", "arrival_time", "arrivalTime", "arrival", "scheduledArrival")),
                    departure_time=_clock(_first(stop, "sch_dep", "departure_time", "departureTime", "departure", "scheduledDeparture")),
                    distance_km=float(_first(stop, "dist", "distance_km", "distanceKm", "distance") or 0.0),
                    day_count=int(_first(stop, "day", "day_count", "dayCount") or 1),
                    platform=str(platform) if platform is not None else None,
                    latitude=float(lat) if lat else (coords[0] if coords else None),
                    longitude=float(lng) if lng else (coords[1] if coords else None),
                )
            )
        except (TypeError, ValueError):
            # One malformed row shouldn't lose the rest of the timetable.
            continue
    return halts


def _first(source: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if source.get(key) is not None:
            return source[key]
    return None


def _clock(value: Any) -> Optional[str]:
    """Reduce an ISO timestamp to HH:MM; pass through values already in that form."""
    if not isinstance(value, str) or not value:
        return None
    return value.split("T", 1)[1][:5] if "T" in value else value[:5]


def journey_hours(train_number: str) -> Optional[float]:
    """Rough journey length, used only to ask whether an older journey could still be running."""
    train = REFERENCE_TRAINS.get(str(train_number))
    if not train or not train.get("halts"):
        return None
    distance = float(train["halts"][-1].get("dist") or 0.0)
    return distance / 55.0 if distance else None
