import json
from typing import Optional
from langchain_core.tools import tool
from app.services.disruption_service import DisruptionService
from app.services.eta_service import ETACalculator
from app.services.orchestrator import LiveDataUnavailable, orchestrator
from app.services.train_schedule_service import IST


def _ist(value) -> Optional[str]:
    return value.astimezone(IST).strftime("%d %b %Y, %H:%M IST") if value else None


async def _status_or_message(train_number: str):
    """Returns (status, None), or (None, a message saying plainly why there is none)."""
    try:
        status = await orchestrator.get_live_status(train_number)
    except LiveDataUnavailable:
        return None, f"Live railway data is temporarily unavailable for train {train_number}. Do not guess its status."
    if not status:
        return None, f"No running record for train {train_number} today or yesterday. It may not run on these days, or the number may be wrong."
    return status, None


@tool
async def get_live_train_status(train_number: str) -> str:
    """Get a train's current state: whether it is running, has reached, has not started or is not running today, plus position, next stop and delay. Always use this before saying anything about a train's status."""
    status, message = await _status_or_message(train_number)
    if not status:
        return message
    return json.dumps({
        "train_number": status.train_number,
        "train_name": status.train_name,
        "service_state": status.service_state,
        "running_status": status.running_status,
        "service_notice": status.service_notice,
        "journey_date_label": status.journey_date_label,
        "also_running_note": status.also_running_note,
        "runs_today": status.runs_today,
        "days_of_run": status.days_of_run,
        "next_run_date": status.next_run_date,
        "origin": status.origin_name,
        "destination": status.destination_name,
        "current_delay_minutes": status.delay_minutes,
        "current_station": status.current_station,
        "previous_station": status.previous_station,
        "next_station": status.next_station,
        "next_stop_expected_at": _ist(status.next_eta),
        "speed_kmph": status.speed_kmph,
        "position_label": status.position_label,
        "position_basis": status.position_basis,
        "passengers_sharing_location": status.crowd_reporters,
        "route_progress_percent": status.route_progress_percent,
        "provider_notices": status.exceptions,
        "observed_at": _ist(status.observed_at),
        "data_age_seconds": status.age_seconds,
        "freshness": status.freshness.value,
        "confidence": status.confidence.value,
        "location_type": status.location_type.value,
        "is_simulated": status.is_simulated,
        "pairing_train_number": status.pairing_train_number,
    })


@tool
async def calculate_train_eta(train_number: str, target_station: str) -> str:
    """Calculate the estimated arrival time (ETA), delay, and arrival platform of a train at a specific destination station."""
    status, message = await _status_or_message(train_number)
    if not status:
        return message
    res = ETACalculator.calculate_eta(status, target_station)
    res["service_state"] = status.service_state
    return json.dumps(res)


@tool
async def get_train_schedule(train_number: str) -> str:
    """Get the complete official timetable and halting sequence of an Indian train."""
    schedule = await orchestrator.get_timetable(train_number)
    if not schedule:
        return f"No schedule found for train {train_number}."
    return json.dumps(schedule)


@tool
async def search_trains_by_name_or_number(query: str) -> str:
    """Search for Indian Railways trains by partial train name or 5-digit number."""
    trains = await orchestrator.search_trains(query)
    return json.dumps(trains)


@tool
async def get_station_live_arrivals_departures(station_code: str, hours: int = 4) -> str:
    """Get upcoming train arrivals and departures at an Indian Railway station (e.g. PUNE, CSMT, NDLS).
    Returns for each train: Train Number, Train Name, Origin, Destination (Where Heading),
    Scheduled & Expected Arrival/Departure, Delay in Minutes, Platform Number, and Current Live Status (at-station, upcoming, departed).
    """
    clean_code = station_code.upper().strip()
    board = await orchestrator.get_station_board(clean_code, hours=hours)
    if not board:
        return f"No board data found for station {clean_code}."

    STATION_NAME_MAP = {
        "CSMT": "Mumbai CSMT", "PUNE": "Pune Junction", "SUR": "Solapur Junction",
        "DR": "Mumbai Dadar", "HWH": "Kolkata Howrah", "NDLS": "New Delhi",
        "KYN": "Kalyan Junction", "MS": "Chennai Egmore", "NZM": "Delhi Hazrat Nizamuddin",
        "HTE": "Hatia (Ranchi)", "UBL": "Hubballi Junction", "KOP": "Kolhapur CSMT",
        "G": "Gondia Junction", "SNSI": "Sainagar Shirdi", "SOU": "Station of Unity (Kevadiya)",
        "VSG": "Vasco da Gama (Goa)", "BEED": "Beed", "NED": "Nanded",
        "PNVL": "Panvel Junction", "LUR": "Latur", "DNR": "Danapur (Patna)",
        "MFP": "Muzaffarpur Junction", "ERS": "Ernakulam South (Kochi)",
        "MAS": "Chennai Central", "SBC": "Bengaluru City", "HYB": "Hyderabad Deccan",
    }

    enriched_trains = []
    for t in board.trains:
        dest_name = STATION_NAME_MAP.get(t.destination, t.destination)
        orig_name = STATION_NAME_MAP.get(t.origin, t.origin)
        enriched_trains.append({
            "train_number": t.train_number,
            "train_name": t.train_name,
            "where_heading": f"{dest_name} ({t.destination})",
            "origin": f"{orig_name} ({t.origin})",
            "platform": f"Platform {t.platform}" if t.platform else "Platform TBD (Announced on arrival)",
            "scheduled_arrival": t.scheduled_arrival,
            "expected_arrival": t.expected_arrival,
            "scheduled_departure": t.scheduled_departure,
            "expected_departure": t.expected_departure,
            "delay_minutes": t.delay_arrival_minutes,
            "live_status": t.status,
        })

    return json.dumps({
        "station_code": board.station_code,
        "station_name": board.station_name,
        "total_trains": len(enriched_trains),
        "trains": enriched_trains,
    })


@tool
async def get_train_coach_composition(train_number: str) -> str:
    """Get the physical rake sequence and coach layout (Loco, SLR, GS, Sleeper, 3A, 2A, 1A) of a train."""
    comp = await orchestrator.get_coach_composition(train_number)
    if not comp:
        return f"No coach composition available for train {train_number}."
    return json.dumps(comp.model_dump(mode="json"))


@tool
async def get_platform_coach_location(train_number: str, coach_code: str) -> str:
    """Find the exact physical platform stopping position, pole number, distance from locomotive, and nearest foot overbridge (FOB) for a specific coach (e.g. B4, S2, H1, C1) on a train."""
    comp = await orchestrator.get_coach_composition(train_number)
    if not comp or not comp.coaches:
        return f"Coach layout for train {train_number} not available."

    target = coach_code.strip().upper()
    matched = None
    for c in comp.coaches:
        if c.coach_code.upper() == target:
            matched = c
            break

    if not matched:
        all_codes = [c.coach_code for c in comp.coaches]
        return f"Coach {coach_code} not found on train {train_number} ({comp.train_name}). Available coaches on this rake are: {', '.join(all_codes)}."

    return json.dumps({
        "train_number": comp.train_number,
        "train_name": comp.train_name,
        "coach_code": matched.coach_code,
        "coach_type": matched.coach_type,
        "position_from_engine": matched.position_number,
        "platform_pole_number": matched.platform_pole_number,
        "distance_from_engine_meters": matched.distance_from_engine_m,
        "nearest_foot_overbridge": matched.nearest_fob,
        "total_coaches_on_rake": comp.total_coaches,
        "platform_walking_advisory": f"Coach {matched.coach_code} stops at Platform Pole #{matched.platform_pole_number}, approximately {matched.distance_from_engine_m} meters from the locomotive near {matched.nearest_fob}."
    })


@tool
async def get_fare_enquiry(
    train_number: str, origin_station: str, destination_station: str, quota: str = "GN"
) -> str:
    """Calculate the official Indian Railways fare across all classes (1A, 2A, 3A, 3E, CC, SL, 2S) and quotas (General, Tatkal)."""
    fare = await orchestrator.get_fare(train_number, origin_station, destination_station, quota=quota)
    return json.dumps(fare.model_dump(mode="json"))


@tool
async def get_pnr_status(pnr: str) -> str:
    """Check PNR booking status, confirmed/waitlist status, and chart preparation status for a 10-digit PNR."""
    try:
        res = await orchestrator.get_pnr_status(pnr)
    except LiveDataUnavailable:
        return "The PNR service is temporarily unavailable. Do not guess this booking's status."
    if not res:
        return f"No PNR status record found for {pnr}."
    return json.dumps(res.model_dump(mode="json"))


@tool
async def get_railway_disruptions_and_mega_blocks(
    category: Optional[str] = None,
    zone: Optional[str] = None,
    train_number: Optional[str] = None,
    station: Optional[str] = None,
) -> str:
    """Network-wide disruptions and mega blocks. There is currently no verified feed, so an empty result means unknown, not that there are none. Say so to the user."""
    summary = DisruptionService.get_disruption_summary(
        alert_type=category, zone=zone, train_number=train_number, station=station
    )
    payload = summary.model_dump(mode="json")
    payload["note"] = "No verified disruption feed is connected. An empty list means unknown, not that there are no disruptions."
    return json.dumps(payload)


@tool
async def check_train_route_diversion_or_cancellation(train_number: str) -> str:
    """Check whether the data provider reports a cancellation, diversion or other notice for this train's current journey."""
    status, message = await _status_or_message(train_number)
    if not status:
        return message
    return json.dumps({
        "train_number": train_number,
        "service_state": status.service_state,
        "is_cancelled": status.service_state == "CANCELLED",
        "provider_notices": status.exceptions,
        "note": "provider_notices is the only source. An empty list means the provider reports nothing, not a guarantee.",
    })


@tool
async def check_train_operating_days_and_pair(train_number: str) -> str:
    """Get the timetable's running days and any paired return train that shares the same rake. For whether the train is actually running now, use get_live_train_status."""
    from app.services.train_schedule_service import TrainOperationsMetadata
    profile = TrainOperationsMetadata.get_profile(train_number)
    if not profile:
        return f"No timetable record for train {train_number}."
    return json.dumps({
        "train_number": profile["number"],
        "train_name": profile["name"],
        "days_of_run": profile["days_of_run"],
        "non_running_reason": profile.get("non_running_reason"),
        "departure_time_ist": profile.get("dep_time"),
        "arrival_time_ist": profile.get("arr_time"),
        "pairing_train": profile.get("pairing_train"),
        "rake_share_description": profile.get("rake_share_description"),
    })


RAILWAY_TOOLS = [
    get_live_train_status,
    check_train_operating_days_and_pair,
    calculate_train_eta,
    get_train_schedule,
    search_trains_by_name_or_number,
    get_station_live_arrivals_departures,
    get_train_coach_composition,
    get_platform_coach_location,
    get_fare_enquiry,
    get_pnr_status,
    get_railway_disruptions_and_mega_blocks,
    check_train_route_diversion_or_cancellation,
]
