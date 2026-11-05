"""Decides where to draw a train, and labels how we know.

The provider reports stations, not coordinates, so between stations any position is
an estimate. Every result says which it is, and "unknown" stays None.
"""
from datetime import datetime, timedelta
from typing import Awaitable, Callable, List, Optional, Tuple
from app.schemas.status import LocationType, RailwayStatus, StationHalt
from app.services.crowd_service import haversine_km
from app.services.train_schedule_service import IST

Coords = Tuple[float, float]
CoordsLookup = Callable[[Optional[str]], Awaitable[Optional[Coords]]]

# Stop short of the next station: we do not know it has arrived until it is reported.
MAX_ESTIMATE_FRACTION = 0.95
AVERAGE_TRAIN_KMPH = 60.0


def _display_name(status: RailwayStatus, code: Optional[str], fallback: Optional[str]) -> str:
    for halt in status.halts:
        if code and halt.station_code == code:
            return halt.station_name
    if fallback:
        return fallback.split(" (")[0]
    return code or "the next station"


def _find_halt(halts: List[StationHalt], code: Optional[str]) -> Optional[StationHalt]:
    return next((h for h in halts if code and h.station_code == code), None)


def _minutes(clock: Optional[str]) -> Optional[int]:
    if not clock or ":" not in clock:
        return None
    try:
        hours, minutes = clock.split(":")[:2]
        return int(hours) * 60 + int(minutes)
    except ValueError:
        return None


def segment_fraction(
    from_halt: Optional[StationHalt],
    to_halt: Optional[StationHalt],
    next_eta: Optional[datetime],
    now: datetime,
) -> Optional[float]:
    """How far along the current section the train should be, from scheduled section time and live ETA."""
    if not from_halt or not to_halt or not next_eta:
        return None
    left = _minutes(from_halt.departure_time or from_halt.arrival_time)
    arrives = _minutes(to_halt.arrival_time or to_halt.departure_time)
    if left is None or arrives is None:
        return None
    section_minutes = (arrives - left) % (24 * 60)
    if section_minutes <= 0:
        return None
    started = next_eta - timedelta(minutes=section_minutes)
    elapsed = (now - started).total_seconds() / 60.0
    return max(0.0, min(MAX_ESTIMATE_FRACTION, elapsed / section_minutes))


def eta_fraction(from_coords: Coords, to_coords: Coords, next_eta: Optional[datetime], now: datetime) -> Optional[float]:
    """Without section times: how far out the train should be, given its ETA at the next stop."""
    if not next_eta:
        return None
    length = haversine_km(from_coords[0], from_coords[1], to_coords[0], to_coords[1])
    if length <= 0:
        return None
    minutes_left = (next_eta - now).total_seconds() / 60.0
    if minutes_left <= 0:
        return MAX_ESTIMATE_FRACTION
    km_left = minutes_left * AVERAGE_TRAIN_KMPH / 60.0
    return max(0.0, min(MAX_ESTIMATE_FRACTION, 1.0 - km_left / length))


async def apply_position(status: RailwayStatus, lookup: CoordsLookup, now: datetime) -> RailwayStatus:
    state = status.service_state

    if state in ("NOT_RUNNING_TODAY", "CANCELLED", "UNKNOWN"):
        return _no_position(status)

    if status.is_simulated:
        status.position_basis = "SCHEDULED" if state == "NOT_STARTED" else "STATION"
        status.position_label = "Simulated demo position"
        return status

    # Provider coordinates are real observations, so they win over anything we can work out.
    if state == "RUNNING" and status.latitude is not None and status.longitude is not None:
        status.position_basis = "PROVIDER_GPS"
        status.location_type = LocationType.GPS_OBSERVED
        status.position_label = "Live GPS from the data provider"
        return status

    if state == "NOT_STARTED":
        code = status.origin_code or (status.halts[0].station_code if status.halts else None)
        coords = await lookup(code)
        name = status.origin_name or _display_name(status, code, None)
        return _at(status, coords, "SCHEDULED", LocationType.PROVIDER_ESTIMATED, f"Scheduled to start from {name}")

    if state == "COMPLETED":
        code = status.destination_code or (status.halts[-1].station_code if status.halts else None)
        coords = await lookup(code)
        name = status.destination_name or _display_name(status, code, None)
        return _at(status, coords, "STATION", LocationType.STATION_OBSERVED, f"Reached {name}")

    return await _running_position(status, lookup, now)


async def _running_position(status: RailwayStatus, lookup: CoordsLookup, now: datetime) -> RailwayStatus:
    from_code = status.current_station_code or status.previous_station_code
    to_code = status.next_station_code
    from_coords = await lookup(from_code)
    to_coords = await lookup(to_code)
    from_name = _display_name(status, from_code, status.current_station)
    to_name = _display_name(status, to_code, status.next_station)

    if from_coords and to_coords:
        fraction = segment_fraction(
            _find_halt(status.halts, from_code), _find_halt(status.halts, to_code), status.next_eta, now
        )
        if fraction is None:
            fraction = eta_fraction(from_coords, to_coords, status.next_eta, now)
        if fraction is not None:
            return _at(status, _between(from_coords, to_coords, fraction), "ESTIMATED", LocationType.APPLICATION_ESTIMATED, f"Estimated between {from_name} and {to_name}")

    if from_coords:
        return _at(status, from_coords, "STATION", LocationType.STATION_OBSERVED, f"Last reported near {from_name}")
    if to_coords:
        # Current station not on the map: work back from the next stop, never sit on it.
        behind = next((h for h in reversed(status.halts) if h.has_arrived and h.latitude is not None and h.longitude is not None), None)
        fraction = eta_fraction((behind.latitude, behind.longitude), to_coords, status.next_eta, now) if behind else None
        if fraction is not None:
            return _at(status, _between((behind.latitude, behind.longitude), to_coords, fraction), "ESTIMATED", LocationType.APPLICATION_ESTIMATED, f"Estimated, approaching {to_name}")
        return _no_position(status, f"Heading to {to_name}, map location not available")
    return _no_position(status, f"Last reported near {from_name}, map location not available" if from_code else None)


def _between(a: Coords, b: Coords, fraction: float) -> Coords:
    return (a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction)


def _at(status: RailwayStatus, coords: Optional[Coords], basis: str, location_type: LocationType, label: str) -> RailwayStatus:
    if not coords:
        return _no_position(status, label)
    status.latitude, status.longitude = coords
    status.position_basis = basis
    status.location_type = location_type
    status.position_label = label
    return status


def _no_position(status: RailwayStatus, label: Optional[str] = None) -> RailwayStatus:
    status.latitude = None
    status.longitude = None
    status.position_basis = "NONE"
    status.location_type = LocationType.SIMULATED if status.is_simulated else LocationType.UNKNOWN
    status.position_label = label
    return status


def mark_progress(status: RailwayStatus) -> RailwayStatus:
    """Work out which stops are done from the provider's reported position."""
    halts = status.halts
    if not halts or status.is_simulated:
        return status

    for halt in halts:
        halt.has_arrived = False
        halt.has_departed = False

    if status.service_state == "COMPLETED":
        for halt in halts:
            halt.has_arrived = True
            halt.has_departed = True
        return status
    if status.service_state != "RUNNING":
        return status

    index = _progress_index(status)
    if index is None:
        return status
    for i, halt in enumerate(halts):
        halt.has_arrived = i <= index
        halt.has_departed = i < index
        halt.delay_minutes = status.delay_minutes if i >= index else halt.delay_minutes
    return status


def _progress_index(status: RailwayStatus) -> Optional[int]:
    codes = [h.station_code for h in status.halts]
    if status.current_station_code in codes:
        return codes.index(status.current_station_code)
    # The current station is often not one of the listed stops, so use its neighbours.
    if status.next_station_code in codes:
        return max(0, codes.index(status.next_station_code) - 1)
    if status.previous_station_code in codes:
        return codes.index(status.previous_station_code)
    if status.route_progress_percent is not None and len(codes) > 1:
        return min(len(codes) - 2, int(status.route_progress_percent / 100.0 * (len(codes) - 1)))
    return None


def ist_clock(value: Optional[datetime]) -> Optional[str]:
    return value.astimezone(IST).strftime("%H:%M") if value else None
