from fastapi import APIRouter, HTTPException
from app.cache.redis_client import cache
from app.schemas.status import PassengerTelemetryReport, RailwayStatus, ResponseEnvelope
from app.services.orchestrator import orchestrator

router = APIRouter(tags=["Live Tracking"])


@router.get("/{train_number}/status", response_model=ResponseEnvelope)
async def get_train_status(train_number: str):
    status = await orchestrator.get_live_status(train_number)
    if not status:
        raise HTTPException(status_code=404, detail=f"No live running status found for train {train_number}")
    return ResponseEnvelope(data=status.model_dump(mode="json"))


@router.post("/{train_number}/telemetry/report", response_model=ResponseEnvelope)
async def report_passenger_telemetry(train_number: str, report: PassengerTelemetryReport):
    """
    Onboard Passenger GPS Telemetry Contribution.
    Accepts anonymous GPS fix from passengers currently on the train,
    validates alignment, caches with HIGH confidence, and immediately
    relays to all other users over WebSockets.
    Strict Zero-PII Policy: Zero identity data collected or stored.
    """
    if not (-90 <= report.latitude <= 90) or not (-180 <= report.longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid GPS coordinates")
    result = await orchestrator.report_passenger_telemetry(train_number, report)
    return ResponseEnvelope(data=result)


@router.get("/{train_number}/crowd", response_model=ResponseEnvelope)
async def get_crowd_telemetry_meta(train_number: str):
    """
    Returns active crowd contributors metadata for this train.
    """
    crowd_meta_key = f"railpulse:crowd_meta:{train_number.strip()}"
    meta = await cache.get_json(crowd_meta_key) or {"active_reporters": 0, "last_reported": None}
    return ResponseEnvelope(data=meta)


@router.get("/{train_number}/schedule", response_model=ResponseEnvelope)
async def get_train_schedule(train_number: str):
    schedule = await orchestrator.get_schedule(train_number)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule not found for train {train_number}")
    return ResponseEnvelope(data=schedule)


@router.get("/{train_number}/route", response_model=ResponseEnvelope)
async def get_train_route(train_number: str):
    route = await orchestrator.get_route(train_number)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route coordinates not found for train {train_number}")
    return ResponseEnvelope(data=route)
