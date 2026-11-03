from fastapi import APIRouter, HTTPException
from app.schemas.status import RailwayStatus, ResponseEnvelope
from app.services.orchestrator import orchestrator

router = APIRouter(prefix="/trains", tags=["Live Tracking"])


@router.get("/{train_number}/status", response_model=ResponseEnvelope)
async def get_train_status(train_number: str):
    status = await orchestrator.get_live_status(train_number)
    if not status:
        raise HTTPException(status_code=404, detail=f"No live running status found for train {train_number}")
    return ResponseEnvelope(data=status.model_dump(mode="json"))


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
