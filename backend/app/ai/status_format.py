"""Turns a live status into plain words, so status replies cannot be misworded by a model."""
from datetime import datetime
from typing import List, Optional
from app.schemas.status import FreshnessState, RailwayStatus
from app.services.journey_resolver import format_day
from app.services.train_schedule_service import IST


def ist_time(value: Optional[datetime]) -> Optional[str]:
    return f"{value.astimezone(IST).strftime('%H:%M')} IST" if value else None


def delay_text(minutes: int) -> str:
    if minutes <= 0:
        return "on time"
    return f"{minutes} minute{'s' if minutes != 1 else ''} late"


def _station(name: Optional[str]) -> Optional[str]:
    return name.split(" (")[0] if name else None


def format_status_reply(status: RailwayStatus) -> str:
    title = f"{status.train_number} {status.train_name}"
    journey = f" (journey started {status.journey_date_label})" if status.journey_date_label else ""
    state = status.service_state
    lines: List[str] = []

    if state == "RUNNING":
        lines.append(f"**{title} is running{journey}.**")
        if status.position_label:
            lines.append(f"- **Position:** {status.position_label}")
        elif status.current_station:
            lines.append(f"- **Last reported near:** {_station(status.current_station)}")
        if status.next_station:
            eta = ist_time(status.next_eta)
            lines.append(f"- **Next stop:** {_station(status.next_station)}" + (f", expected at {eta}" if eta else ""))
        lines.append(f"- **Running:** {delay_text(status.delay_minutes)}")
        if status.speed_kmph is not None:
            lines.append(f"- **Speed:** {round(status.speed_kmph)} km/h")
    elif state == "COMPLETED":
        lines.append(f"**{title} has reached {status.destination_name or 'its destination'}{journey}.**")
    elif state == "NOT_STARTED":
        where = status.origin_name or "its origin"
        lines.append(f"**{title} has not started yet.** It is due to leave {where} today.")
        if status.next_eta and status.next_station:
            lines.append(f"- **First stop:** {_station(status.next_station)}, expected at {ist_time(status.next_eta)}")
    elif state == "NOT_RUNNING_TODAY":
        lines.append(f"**{title} is not running today.**")
    elif state == "CANCELLED":
        lines.append(f"**{title} is reported as cancelled{journey}.** Please check with Indian Railways before travelling.")
    else:
        lines.append(f"**{title}: {status.running_status}.**")

    if status.also_running_note:
        lines.append(f"- {status.also_running_note}")
    if status.service_notice:
        lines.append(f"- {status.service_notice}")
    for item in status.exceptions:
        message = item.get("message") or item.get("description") or item.get("type")
        if message:
            lines.append(f"- **Provider notice:** {message}")
    if status.days_of_run and state in ("NOT_RUNNING_TODAY", "NOT_STARTED", "COMPLETED", "UNKNOWN"):
        lines.append(f"- **Runs on:** {', '.join(status.days_of_run)}")
    if status.next_run_date:
        lines.append(f"- **Next run:** {format_day(status.next_run_date)}")

    if status.is_simulated:
        lines.append("\n⚠️ This is simulated demo data, not live information.")
    elif status.freshness == FreshnessState.STALE:
        lines.append(f"\n⚠️ Last known status, from {ist_time(status.observed_at)}. Live data is currently unavailable.")
    elif state in ("RUNNING", "NOT_STARTED", "COMPLETED"):
        lines.append(f"\nUpdated at {ist_time(status.observed_at)}.")

    if state == "RUNNING" and status.position_basis != "PASSENGER_GPS":
        lines.append("Are you on this train? Share your location below to show its exact position to everyone.")
    return "\n".join(lines)
