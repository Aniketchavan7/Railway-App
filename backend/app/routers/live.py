from fastapi import APIRouter, HTTPException
from app.schemas.status import PassengerTelemetryReport, ResponseEnvelope
from app.services import crowd_service
from app.services.orchestrator import LiveDataUnavailable, orchestrator

router = APIRouter(tags=["Live Tracking"])


@router.get("/{train_number}/status", response_model=ResponseEnvelope)
async def get_train_status(train_number: str):
    try:
        status = await orchestrator.get_live_status(train_number)
    except LiveDataUnavailable:
        raise HTTPException(
            status_code=503,
            detail=f"Live railway data is temporarily unavailable, and we have no timetable for train {train_number}.",
        )
    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"No running record for train {train_number} today or yesterday. It may not run on these days, or the number may be wrong.",
        )
    return ResponseEnvelope(data=status.model_dump(mode="json"))


@router.post("/{train_number}/telemetry/report", response_model=ResponseEnvelope)
async def report_passenger_telemetry(train_number: str, report: PassengerTelemetryReport):
    """Anonymous GPS from a passenger who chose to share. See services/crowd_service.py."""
    try:
        result = await orchestrator.report_passenger_telemetry(train_number, report)
    except LiveDataUnavailable:
        raise HTTPException(status_code=503, detail="Live railway data is temporarily unavailable.")
    return ResponseEnvelope(data=result)


@router.get("/{train_number}/crowd", response_model=ResponseEnvelope)
async def get_crowd_telemetry_meta(train_number: str):
    """How many passengers are currently sharing this train's position."""
    return ResponseEnvelope(data=await crowd_service.get_meta(train_number.strip()))


@router.get("/{train_number}/schedule", response_model=ResponseEnvelope)
async def get_train_schedule(train_number: str):
    schedule = await orchestrator.get_timetable(train_number)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule not found for train {train_number}")
    return ResponseEnvelope(data=schedule)


@router.get("/{train_number}/route", response_model=ResponseEnvelope)
async def get_train_route(train_number: str):
    route = await orchestrator.get_route(train_number)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route coordinates not found for train {train_number}")
    return ResponseEnvelope(data=route)
