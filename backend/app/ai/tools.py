import json
from typing import Optional
from langchain_core.tools import tool
from app.services.disruption_service import DisruptionService
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


@tool
async def get_railway_disruptions_and_mega_blocks(
    category: Optional[str] = None,
    zone: Optional[str] = None,
    train_number: Optional[str] = None,
    station: Optional[str] = None,
) -> str:
    """Fetch active Indian Railways disruptions, including Mega Blocks, Jumbo Blocks, Route Diversions, Cancelled Trains, Rescheduled Services, and Heavy Delays.
    Arguments:
    - category: Filter by disruption type (MEGA_BLOCK, ROUTE_DIVERSION, CANCELLATION, RESCHEDULED, RUNNING_LATE)
    - zone: Railway Zone code (CR, WR, NR, SCR, ECR, etc.)
    - train_number: Optional 5-digit train number (e.g. 12115, 22225)
    - station: Station code or name (e.g. CSMT, PUNE, NDLS, Kalyan)
    """
    summary = DisruptionService.get_disruption_summary(
        alert_type=category, zone=zone, train_number=train_number, station=station
    )
    return json.dumps(summary.model_dump(mode="json"))


@tool
async def check_train_route_diversion_or_cancellation(train_number: str) -> str:
    """Check if a specific train (e.g. 12115, 22225, 12158) is running on a diverted route, cancelled, short-terminated, or heavily delayed due to track work or mega blocks."""
    alerts = DisruptionService.get_train_disruptions(train_number)
    if not alerts:
        return json.dumps({
            "train_number": train_number,
            "is_diverted": False,
            "is_cancelled": False,
            "active_disruptions": [],
            "message": f"No route diversions or cancellations reported for train {train_number}. Operating on normal route."
        })
    return json.dumps({
        "train_number": train_number,
        "active_disruptions": [a.model_dump(mode="json") for a in alerts]
    })


@tool
async def get_mega_blocks_by_zone_or_station(station_or_zone: Optional[str] = None) -> str:
    """Fetch active Sunday mega blocks, jumbo maintenance blocks, and speed restrictions affecting suburban lines and long-distance corridors for a station (e.g. CSMT, PUNE, NDLS, Kalyan) or zone (CR, WR)."""
    blocks = DisruptionService.get_corridor_mega_blocks(station_or_zone)
    return json.dumps([b.model_dump(mode="json") for b in blocks])


RAILWAY_TOOLS = [
    get_live_train_status,
    calculate_train_eta,
    get_train_schedule,
    search_trains_by_name_or_number,
    get_station_live_arrivals_departures,
    get_train_coach_composition,
    get_fare_enquiry,
    get_pnr_status,
    get_railway_disruptions_and_mega_blocks,
    check_train_route_diversion_or_cancellation,
    get_mega_blocks_by_zone_or_station,
]
