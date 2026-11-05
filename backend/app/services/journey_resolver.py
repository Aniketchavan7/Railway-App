"""Works out which journey of a train to report, and what state it is in.

A train number is not one train. Yesterday's departure can still be running while
today's has not started, and a provider asked only about today reports "not started"
for a train that is hundreds of kilometres down the line. So we ask about both.
"""
import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from app.cache.redis_client import cache
from app.providers.base import ProviderUnavailable
from app.providers.registry import registry
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus
from app.services.reference_lookup import journey_hours
from app.services.train_schedule_service import DAY_NAMES, IST, TrainOperationsMetadata

logger = logging.getLogger("railpulse.services.journey_resolver")

# Live states change quickly; settled ones do not, and the provider allows 60 requests a minute.
JOURNEY_TTL_SECONDS = {"RUNNING": 45, "NOT_STARTED": 120, "COMPLETED": 300, "CANCELLED": 300}
NO_RECORD_TTL_SECONDS = 300
LAST_GOOD_TTL_SECONDS = 6 * 3600
# The provider only answers for yesterday onwards, so older journeys need this check.
OLDEST_JOURNEY_DAYS_BACK = 4
FROZEN_AFTER_HOURS = 3


@dataclass
class Resolution:
    status: Optional[RailwayStatus]
    # False means the status is None because no provider could be asked.
    provider_answered: bool


def format_day(date_str: Optional[str]) -> Optional[str]:
    """2026-11-04 -> Wed 4 Nov"""
    if not date_str:
        return None
    try:
        parsed = datetime.strptime(date_str[:10], "%Y-%m-%d")
    except ValueError:
        return date_str
    return f"{parsed.strftime('%a')} {parsed.day} {parsed.strftime('%b')}"


async def _fetch_journey(provider, train_number: str, journey_date: str) -> Tuple[Optional[RailwayStatus], bool]:
    """Returns the journey, and whether the provider was really asked (not just the cache)."""
    key = f"railpulse:journey:{provider.provider_name}:{train_number}:{journey_date}"
    cached = await cache.get_json(key)
    if cached is not None:
        return (None if cached.get("no_record") else RailwayStatus(**cached)), False

    status = await provider.get_live_status(train_number, journey_date=journey_date)
    if status is None:
        await cache.set_json(key, {"no_record": True}, ttl_seconds=NO_RECORD_TTL_SECONDS)
        return None, True
    status.journey_date = journey_date
    ttl = JOURNEY_TTL_SECONDS.get(status.service_state, 45)
    await cache.set_json(key, status.model_dump(mode="json"), ttl_seconds=ttl)
    return status, True


def _is_frozen(status: Optional[RailwayStatus], now: datetime) -> bool:
    """A "running" record whose next stop was due hours ago has stopped updating.

    The provider's ETA already includes the running delay, so this is not a late train.
    Seen for real: 22226 still "RUNNING" near Sion 14 hours after it was due at Dadar.
    """
    if not status or status.service_state != "RUNNING" or not status.next_eta:
        return False
    return now - status.next_eta > timedelta(hours=FROZEN_AFTER_HOURS)


def _pick_journey(
    yesterday: Optional[RailwayStatus], today: Optional[RailwayStatus]
) -> Tuple[Optional[RailwayStatus], Optional[str]]:
    y_state = yesterday.service_state if yesterday else None
    t_state = today.service_state if today else None

    if y_state == "RUNNING" and t_state == "RUNNING":
        where = yesterday.current_station or "en route"
        return today, f"The train that started on {format_day(yesterday.journey_date)} is also still running, near {where}."
    if y_state == "RUNNING":
        return yesterday, None
    if today:
        return today, None
    # A leftover "not started" or "cancelled" from yesterday says nothing about now.
    return (yesterday if y_state == "COMPLETED" else None), None


def _possible_older_journey(train_number: str, now_ist: datetime) -> Optional[str]:
    """A long-distance journey that began before the provider's lookup window may still be running."""
    profile = TrainOperationsMetadata.get_profile(train_number)
    hours = journey_hours(train_number)
    if not profile or not hours or not profile.get("dep_time"):
        return None
    hour, minute = (int(part) for part in profile["dep_time"].split(":"))
    for days_back in range(2, OLDEST_JOURNEY_DAYS_BACK + 1):
        start = (now_ist - timedelta(days=days_back)).replace(hour=hour, minute=minute, second=0, microsecond=0)
        if DAY_NAMES[start.weekday()] in profile["days_of_run"] and start + timedelta(hours=hours) > now_ist:
            return start.strftime("%Y-%m-%d")
    return None


def _timetable_status(
    train_number: str,
    now: datetime,
    state: str,
    running_status: str,
    notice: str,
    journey_date: Optional[str] = None,
) -> RailwayStatus:
    profile = TrainOperationsMetadata.get_profile(train_number) or {}
    now_ist = now.astimezone(IST)
    return RailwayStatus(
        train_number=str(train_number),
        train_name=profile.get("name", f"Train {train_number}"),
        journey_date=journey_date or now_ist.strftime("%Y-%m-%d"),
        running_status=running_status,
        source_provider="reference_timetable",
        observed_at=now,
        fetched_at=now,
        age_seconds=0,
        freshness=FreshnessState.UNKNOWN,
        confidence=ConfidenceLevel.LOW,
        location_type=LocationType.UNKNOWN,
        is_simulated=False,
        service_state=state,
        service_notice=notice,
        origin_code=profile.get("origin"),
        origin_name=profile.get("origin_name"),
        destination_code=profile.get("destination"),
        destination_name=profile.get("destination_name"),
    )


def no_record_status(train_number: str, now: datetime, provider_name: str = "railway_engine") -> Optional[RailwayStatus]:
    """The provider has no journey for today or yesterday. Unknown numbers return None (a real 404)."""
    if not TrainOperationsMetadata.get_profile(train_number):
        return None

    now_ist = now.astimezone(IST)
    older = _possible_older_journey(train_number, now_ist)
    if older:
        return _timetable_status(
            train_number, now, "UNKNOWN",
            f"May still be running from {format_day(older)}",
            f"This train left on {format_day(older)} and may still be on its way, but live data only "
            "reaches back one day. If you are on it, sharing your location will show it here.",
            journey_date=older,
        )

    day = now_ist.strftime("%A")
    profile = TrainOperationsMetadata.get_profile(train_number) or {}
    days = profile.get("days_of_run", [])
    if DAY_NAMES[now_ist.weekday()] in days:
        dep_time = profile.get("dep_time")
        if dep_time and now_ist.strftime("%H:%M") < dep_time:
            # Providers often have no record until close to departure.
            status = _timetable_status(
                train_number, now, "NOT_STARTED", f"Due to start at {dep_time} IST",
                f"The timetable has this train leaving {profile.get('origin_name')} at {dep_time} IST today. Live data isn't available yet.",
            )
            status.runs_today = True
            return status
        return _timetable_status(
            train_number, now, "UNKNOWN", "No running record today",
            f"The timetable lists {day} as a running day, but there is no live record for today's journey. Please check with Indian Railways.",
        )

    reason = profile.get("non_running_reason")
    notice = f"No service on {day}s" + (f": {reason}." if reason else ".")
    status = _timetable_status(train_number, now, "NOT_RUNNING_TODAY", "Not running today", notice)
    status.runs_today = False
    # The provider was asked and has no journey, so this is current information.
    status.source_provider = provider_name
    status.freshness = FreshnessState.LIVE
    status.confidence = ConfidenceLevel.MEDIUM
    return status


def unavailable_status(train_number: str, now: datetime) -> Optional[RailwayStatus]:
    """No provider could be asked. Say so, and offer what the timetable would expect."""
    if not TrainOperationsMetadata.get_profile(train_number):
        return None
    expected = TrainOperationsMetadata.check_operational_status(train_number, now)
    return _timetable_status(
        train_number, now, "UNKNOWN", "Live data unavailable",
        f"Live running data is temporarily unavailable. The timetable expects: {expected['running_status']}.",
    )


async def resolve_journey(train_number: str, now: Optional[datetime] = None) -> Resolution:
    now = now or datetime.now(timezone.utc)
    now_ist = now.astimezone(IST)
    today_str = now_ist.strftime("%Y-%m-%d")
    yesterday_str = (now_ist - timedelta(days=1)).strftime("%Y-%m-%d")

    providers = registry.get_providers_for_capability("LIVE_STATUS")
    for provider in [p for p in providers if p.provider_name != "offline_simulator"]:
        try:
            (yesterday, asked_y), (today, asked_t) = await asyncio.gather(
                _fetch_journey(provider, train_number, yesterday_str),
                _fetch_journey(provider, train_number, today_str),
            )
        except ProviderUnavailable as e:
            registry.record_failure(provider.provider_name)
            logger.warning("%s unavailable for train %s: %s", provider.provider_name, train_number, e)
            continue
        except Exception as e:
            registry.record_failure(provider.provider_name)
            logger.warning("%s failed for train %s: %s", provider.provider_name, train_number, e)
            continue

        # Cache hits say nothing about the provider, and must not reset its breaker.
        if asked_y or asked_t:
            registry.record_success(provider.provider_name)
        # Yesterday's journey is over if its record froze. Today's is real but out of date.
        if _is_frozen(yesterday, now):
            yesterday = None
        chosen, also_running = _pick_journey(yesterday, today)
        if chosen and _is_frozen(chosen, now):
            chosen.freshness = FreshnessState.STALE
            chosen.service_notice = "No update from the data provider for several hours, so this may be out of date."
        if chosen is None:
            return Resolution(no_record_status(train_number, now, provider.provider_name), provider_answered=True)
        chosen.also_running_note = also_running
        chosen.runs_today = today is not None
        await cache.set_json(_last_good_key(train_number), chosen.model_dump(mode="json"), ttl_seconds=LAST_GOOD_TTL_SECONDS)
        return Resolution(chosen, provider_answered=True)

    # Real providers could not answer: a stale fact beats an invented one.
    last_good = await cache.get_json(_last_good_key(train_number))
    if last_good:
        status = RailwayStatus(**last_good)
        status.freshness = FreshnessState.STALE
        status.service_notice = "Live data is temporarily unavailable. Showing the last known status."
        return Resolution(status, provider_answered=False)

    for provider in providers:
        if provider.provider_name == "offline_simulator":
            simulated = await provider.get_live_status(train_number)
            if simulated:
                return Resolution(simulated, provider_answered=False)

    return Resolution(unavailable_status(train_number, now), provider_answered=False)


def _last_good_key(train_number: str) -> str:
    return f"railpulse:lastgood:{train_number}"


def next_run_date(train_number: str, now: datetime) -> Optional[str]:
    """Next date this train is due to start, from its running days."""
    profile = TrainOperationsMetadata.get_profile(train_number)
    if not profile or not profile.get("days_of_run"):
        return None
    now_ist = now.astimezone(IST)
    days: List[str] = profile["days_of_run"]
    dep_time = profile.get("dep_time") or "00:00"
    for offset in range(0, 8):
        candidate = now_ist + timedelta(days=offset)
        if DAY_NAMES[candidate.weekday()] not in days:
            continue
        if offset == 0 and now_ist.strftime("%H:%M") >= dep_time:
            continue
        return candidate.strftime("%Y-%m-%d")
    return None
