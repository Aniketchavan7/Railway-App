from fastapi import APIRouter, HTTPException, Query
from app.schemas.status import ResponseEnvelope
from app.services.orchestrator import orchestrator

router = APIRouter(tags=["Search & Stations"])


@router.get("/trains/search", response_model=ResponseEnvelope)
async def search_trains(q: str = Query(..., min_length=1, description="Train number or partial name")):
    results = await orchestrator.search_trains(q)
    return ResponseEnvelope(data=results)


@router.get("/stations/search", response_model=ResponseEnvelope)
async def search_stations(q: str = Query(..., min_length=1, description="Station code or city name")):
    stations = await orchestrator.search_stations(q)
    return ResponseEnvelope(data=[s.model_dump() for s in stations])


@router.get("/stations/{station_code}", response_model=ResponseEnvelope)
@router.get("/station/{station_code}", response_model=ResponseEnvelope)
async def get_station_details(station_code: str):
    st = await orchestrator.get_station(station_code)
    if not st:
        raise HTTPException(status_code=404, detail=f"Station code {station_code} not found")
    return ResponseEnvelope(data=st.model_dump())


@router.get("/stations/{station_code}/live", response_model=ResponseEnvelope)
@router.get("/station/{station_code}/live", response_model=ResponseEnvelope)
async def get_station_live_board(station_code: str, hours: int = Query(4, ge=1, le=8)):
    board = await orchestrator.get_station_board(station_code, hours=hours)
    if not board:
        raise HTTPException(status_code=404, detail=f"Live board not available for station {station_code}")
    return ResponseEnvelope(data=board.model_dump(mode="json"))
