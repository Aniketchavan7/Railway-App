from fastapi import APIRouter, HTTPException, Query
from app.schemas.status import ResponseEnvelope
from app.services.orchestrator import orchestrator

router = APIRouter(prefix="/trains", tags=["Train Details"])


@router.get("/{train_number}/coaches", response_model=ResponseEnvelope)
async def get_coach_composition(train_number: str):
    comp = await orchestrator.get_coach_composition(train_number)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Coach layout not found for train {train_number}")
    return ResponseEnvelope(data=comp.model_dump(mode="json"))


@router.get("/{train_number}/platforms", response_model=ResponseEnvelope)
async def get_platform_numbers(train_number: str):
    platforms = await orchestrator.get_platform_information(train_number)
    return ResponseEnvelope(data=[p.model_dump() for p in platforms])


@router.get("/{train_number}/fare", response_model=ResponseEnvelope)
async def get_fare_enquiry(
    train_number: str,
    origin: str = Query(..., description="Origin station code (e.g. CSMT)"),
    dest: str = Query(..., description="Destination station code (e.g. PUNE)"),
    quota: str = Query("GN", description="Quota: GN, TQ, PT, SS, LD"),
):
    fare = await orchestrator.get_fare(train_number, origin, dest, quota)
    return ResponseEnvelope(data=fare.model_dump(mode="json"))
