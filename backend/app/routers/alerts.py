from typing import Optional
from fastapi import APIRouter, Query
from app.schemas.status import ResponseEnvelope
from app.services.disruption_service import DisruptionService

router = APIRouter(prefix="/alerts", tags=["Disruptions & Mega Blocks"])


@router.get("/disruptions", response_model=ResponseEnvelope)
async def get_disruptions(
    type: Optional[str] = Query(None, description="Filter: MEGA_BLOCK, ROUTE_DIVERSION, CANCELLATION, RESCHEDULED, RUNNING_LATE"),
    zone: Optional[str] = Query(None, description="Railway Zone: CR, WR, NR, SCR, ECR, etc."),
    train_number: Optional[str] = Query(None, description="5-digit train number"),
    station: Optional[str] = Query(None, description="Station code (e.g. CSMT, PUNE, NDLS)"),
):
    """
    Get active Indian Railways disruptions, including Mega Blocks, Jumbo Blocks,
    Route Diversions, Cancelled Trains, and Heavy Delays.
    """
    summary = DisruptionService.get_disruption_summary(
        alert_type=type, zone=zone, train_number=train_number, station=station
    )
    return ResponseEnvelope(data=summary.model_dump(mode="json"))


@router.get("/mega-blocks", response_model=ResponseEnvelope)
async def get_mega_blocks(
    zone: Optional[str] = Query(None, description="Railway zone (e.g. CR, WR)"),
    station: Optional[str] = Query(None, description="Station or corridor (e.g. CSMT, Kalyan)"),
):
    """
    Get active and upcoming Railway Mega Blocks & Jumbo Maintenance Blocks.
    """
    blocks = DisruptionService.get_corridor_mega_blocks(station_or_zone=station or zone)
    return ResponseEnvelope(data=[b.model_dump(mode="json") for b in blocks])


@router.get("/diverted-cancelled", response_model=ResponseEnvelope)
async def get_diverted_and_cancelled():
    """
    Get all diverted, cancelled, and short-terminated trains.
    """
    alerts = DisruptionService.get_all_alerts()
    filtered = [
        a for a in alerts
        if a.alert_type.value in ("ROUTE_DIVERSION", "CANCELLATION", "SHORT_TERMINATION")
    ]
    return ResponseEnvelope(data=[a.model_dump(mode="json") for a in filtered])


@router.get("/delayed", response_model=ResponseEnvelope)
async def get_delayed_trains():
    """
    Get heavily delayed and rescheduled trains.
    """
    alerts = DisruptionService.get_all_alerts()
    filtered = [
        a for a in alerts
        if a.alert_type.value in ("RUNNING_LATE", "RESCHEDULED")
    ]
    return ResponseEnvelope(data=[a.model_dump(mode="json") for a in filtered])


@router.get("/train/{train_number}", response_model=ResponseEnvelope)
async def get_train_specific_disruptions(train_number: str):
    """
    Check active route changes, mega blocks, or cancellations for a specific train.
    """
    alerts = DisruptionService.get_train_disruptions(train_number)
    return ResponseEnvelope(data=[a.model_dump(mode="json") for a in alerts])
