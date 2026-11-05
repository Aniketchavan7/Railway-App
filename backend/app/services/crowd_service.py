"""Combines GPS from passengers who chose to share into one position for a train.

Privacy: reports hold a random per-trip id, a position and a time, and last 60 seconds.
No account, IP address or device identifier is received or stored, and coordinates are
never logged. While sharing, a passenger's position is visible as the train's position,
which the consent prompt says plainly.

Trust: a single phone must not be able to move a train for everyone, so reports must
pass plausibility checks and be consistent before they count. This raises the bar; it
cannot prove someone is on board.
"""
import math
import statistics
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.cache.redis_client import cache
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, PassengerTelemetryReport, RailwayStatus

REPORT_MAX_AGE_SECONDS = 60
STORE_TTL_SECONDS = 90
MIN_SECONDS_BETWEEN_REPORTS = 5.0
MAX_ACCURACY_METERS = 150.0
MAX_PLAUSIBLE_SPEED_KMPH = 220.0
PINGS_BEFORE_COUNTING = 2
OUTLIER_KM = 5.0
MAX_REPORTERS_PER_TRAIN = 50
# Route lines join stops directly while real track curves, so allow for that on long sections.
MIN_ROUTE_TOLERANCE_KM = 15.0
ROUTE_TOLERANCE_FRACTION = 0.2
# Far from where the provider puts the train means a different journey or a wrong train.
# Estimates on long sections are far less certain than a reported station.
MAX_KM_FROM_REPORTED_STATION = 150.0
MAX_KM_FROM_ESTIMATE = 300.0
SHARING_STATES = ("RUNNING", "UNKNOWN")


@dataclass
class IngestResult:
    status: str  # accepted, pending, ignored, rejected
    reason: Optional[str] = None
    message: Optional[str] = None
    active_reporters: int = 0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _distance_to_segment_km(point: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> float:
    # Flat projection is accurate enough at the scale of a route section.
    scale = math.cos(math.radians(point[0]))
    ax, ay = (a[1] - point[1]) * scale, a[0] - point[0]
    bx, by = (b[1] - point[1]) * scale, b[0] - point[0]
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    t = 0.0 if length_sq == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / length_sq))
    return math.hypot(ax + t * dx, ay + t * dy) * 111.0


def is_near_route(lat: float, lng: float, route: List[Tuple[float, float]]) -> bool:
    """With no route to compare against, we cannot say the report is wrong."""
    if len(route) < 2:
        return True
    for a, b in zip(route, route[1:]):
        tolerance = max(MIN_ROUTE_TOLERANCE_KM, haversine_km(a[0], a[1], b[0], b[1]) * ROUTE_TOLERANCE_FRACTION)
        if _distance_to_segment_km((lat, lng), a, b) <= tolerance:
            return True
    return False


def _key(train_number: str) -> str:
    return f"railpulse:crowd:{train_number}"


async def _load(train_number: str, now: float) -> Dict[str, Dict[str, Any]]:
    stored = await cache.get_json(_key(train_number)) or {}
    return {rid: r for rid, r in stored.items() if now - r.get("ts", 0) <= REPORT_MAX_AGE_SECONDS}


def _counted(reports: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [r for r in reports.values() if r.get("good", 0) >= PINGS_BEFORE_COUNTING]


def _rejection(reason: str, message: str, active: int) -> IngestResult:
    return IngestResult(status="rejected", reason=reason, message=message, active_reporters=active)


async def ingest(
    report: PassengerTelemetryReport, base: RailwayStatus, now: Optional[float] = None
) -> IngestResult:
    now = now if now is not None else time.time()
    train_number = base.train_number
    reports = await _load(train_number, now)
    active = len(_counted(reports))

    if base.service_state not in SHARING_STATES:
        return _rejection("train_not_running", "This train is not running right now, so your location was not used.", active)
    if report.accuracy_meters is None or report.accuracy_meters > MAX_ACCURACY_METERS:
        return _rejection("low_accuracy", "Your GPS signal is too weak right now. We will keep trying.", active)

    route = [(h.latitude, h.longitude) for h in base.halts if h.latitude is not None and h.longitude is not None]
    if not is_near_route(report.latitude, report.longitude, route):
        return _rejection("off_route", "You don't appear to be on this train's route, so your location was not used.", active)

    limit = {"ESTIMATED": MAX_KM_FROM_ESTIMATE, "STATION": MAX_KM_FROM_REPORTED_STATION}.get(base.position_basis)
    if limit and base.latitude is not None and base.longitude is not None:
        if haversine_km(report.latitude, report.longitude, base.latitude, base.longitude) > limit:
            return _rejection("far_from_train", "You appear to be far from where this train was last reported, so your location was not used.", active)

    previous = reports.get(report.reporter_id)
    good = 1
    if previous:
        elapsed = now - previous["ts"]
        if elapsed < MIN_SECONDS_BETWEEN_REPORTS:
            return IngestResult(status="ignored", reason="too_frequent", active_reporters=active)
        speed = haversine_km(previous["lat"], previous["lng"], report.latitude, report.longitude) / (elapsed / 3600.0)
        # A jump no train could make restarts this reporter's consistency count.
        good = 1 if speed > MAX_PLAUSIBLE_SPEED_KMPH else previous.get("good", 0) + 1
    elif len(reports) >= MAX_REPORTERS_PER_TRAIN:
        return IngestResult(status="ignored", reason="enough_reporters", active_reporters=active)

    reports[report.reporter_id] = {
        "lat": report.latitude,
        "lng": report.longitude,
        "speed": report.speed_kmph,
        "ts": now,
        "good": good,
    }
    await cache.set_json(_key(train_number), reports, ttl_seconds=STORE_TTL_SECONDS)

    active = len(_counted(reports))
    return IngestResult(
        status="accepted" if good >= PINGS_BEFORE_COUNTING else "pending",
        active_reporters=active,
    )


def fuse(reports: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Median position with disagreeing reports dropped, so one bad phone cannot pull the result."""
    if not reports:
        return None
    mid_lat = statistics.median(r["lat"] for r in reports)
    mid_lng = statistics.median(r["lng"] for r in reports)
    agreeing = [r for r in reports if haversine_km(r["lat"], r["lng"], mid_lat, mid_lng) <= OUTLIER_KM]
    if not agreeing:
        return None
    speeds = [r["speed"] for r in agreeing if r.get("speed") is not None]
    return {
        "lat": statistics.median(r["lat"] for r in agreeing),
        "lng": statistics.median(r["lng"] for r in agreeing),
        "speed": statistics.median(speeds) if speeds else None,
        "count": len(agreeing),
        "newest": max(r["ts"] for r in agreeing),
    }


async def get_meta(train_number: str, now: Optional[float] = None) -> Dict[str, Any]:
    now = now if now is not None else time.time()
    counted = _counted(await _load(train_number, now))
    newest = max((r["ts"] for r in counted), default=None)
    return {"active_reporters": len(counted), "last_reported_seconds_ago": int(now - newest) if newest else None}


async def apply_overlay(status: RailwayStatus, now: Optional[float] = None) -> RailwayStatus:
    """Passengers improve where the train is shown. State and delay stay with the provider."""
    now = now if now is not None else time.time()
    if status.service_state not in SHARING_STATES:
        return status
    fused = fuse(_counted(await _load(status.train_number, now)))
    if not fused:
        return status

    status.latitude = fused["lat"]
    status.longitude = fused["lng"]
    if fused["speed"] is not None:
        status.speed_kmph = float(fused["speed"])
    status.location_type = LocationType.GPS_OBSERVED
    status.position_basis = "PASSENGER_GPS"
    status.crowd_reporters = fused["count"]
    status.confidence = ConfidenceLevel.HIGH if fused["count"] >= 2 else ConfidenceLevel.MEDIUM
    status.freshness = FreshnessState.LIVE
    status.observed_at = datetime.fromtimestamp(fused["newest"], tz=timezone.utc)
    status.age_seconds = max(0, int(now - fused["newest"]))

    who = "1 passenger" if fused["count"] == 1 else f"{fused['count']} passengers"
    nearest = _nearest_halt(status, fused["lat"], fused["lng"])
    status.position_label = f"From {who} on board" + (f", near {nearest}" if nearest else "")

    if status.service_state == "UNKNOWN":
        # The provider has no data, so passengers are the only evidence the train is moving.
        status.service_state = "RUNNING"
        status.running_status = f"Running, based on {who} on board"
        status.service_notice = "Live provider data is not available for this journey. This position comes only from passengers sharing their location."
    return status


def _nearest_halt(status: RailwayStatus, lat: float, lng: float) -> Optional[str]:
    best_name, best_km = None, 30.0
    for halt in status.halts:
        if halt.latitude is None or halt.longitude is None:
            continue
        km = haversine_km(lat, lng, halt.latitude, halt.longitude)
        if km < best_km:
            best_name, best_km = halt.station_name, km
    return best_name
