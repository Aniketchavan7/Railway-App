import json
from typing import Optional
from langchain_core.tools import tool
from app.services.eta_service import ETACalculator
from app.services.orchestrator import orchestrator


@tool
async def get_live_train_status(train_number: str) -> str:
    """Retrieve the real-time running status, current delay, and location for a given 5-digit Indian train number."""
    status = await orchestrator.get_live_status(train_number)
    if not status:
        return f"No live status found for train {train_number}."
    return json.dumps({
        "train_number": status.train_number,
        "train_name": status.train_name,
        "running_status": status.running_status,
        "current_delay_minutes": status.delay_minutes,
        "current_station": status.current_station,
        "previous_station": status.previous_station,
        "next_station": status.next_station,
        "speed_kmph": status.speed_kmph,
        "observed_at": status.observed_at.isoformat(),
        "data_age_seconds": status.age_seconds,
        "freshness": status.freshness.value,
        "confidence": status.confidence.value,
        "location_type": status.location_type.value,
        "is_simulated": status.is_simulated,
    })


@tool
async def calculate_train_eta(train_number: str, target_station: str) -> str:
    """Calculate the estimated arrival time (ETA), delay, and arrival platform of a train at a specific destination station."""
    status = await orchestrator.get_live_status(train_number)
    if not status:
        return f"Unable to fetch train {train_number} to calculate ETA for {target_station}."
    res = ETACalculator.calculate_eta(status, target_station)
    return json.dumps(res)


@tool
async def get_train_schedule(train_number: str) -> str:
    """Get the complete official timetable and halting sequence of an Indian train."""
    schedule = await orchestrator.get_schedule(train_number)
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
    """Get upcoming train arrivals and departures at an Indian Railway station within a time window (2 to 8 hours)."""
    board = await orchestrator.get_station_board(station_code, hours=hours)
    if not board:
        return f"No board data found for station {station_code}."
    return json.dumps(board.model_dump(mode="json"))


@tool
async def get_train_coach_composition(train_number: str) -> str:
    """Get the physical rake sequence and coach layout (Loco, SLR, GS, Sleeper, 3A, 2A, 1A) of a train."""
    comp = await orchestrator.get_coach_composition(train_number)
    if not comp:
        return f"No coach composition available for train {train_number}."
    return json.dumps(comp.model_dump(mode="json"))


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
    res = await orchestrator.get_pnr_status(pnr)
    if not res:
        return f"No PNR status record found for {pnr}."
    return json.dumps(res.model_dump(mode="json"))


RAILWAY_TOOLS = [
    get_live_train_status,
    calculate_train_eta,
    get_train_schedule,
    search_trains_by_name_or_number,
    get_station_live_arrivals_departures,
    get_train_coach_composition,
    get_fare_enquiry,
    get_pnr_status,
]
