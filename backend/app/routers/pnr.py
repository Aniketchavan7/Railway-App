import re
from fastapi import APIRouter, HTTPException
from app.schemas.status import ResponseEnvelope
from app.services.orchestrator import LiveDataUnavailable, orchestrator

router = APIRouter(tags=["PNR Enquiry"])


@router.get("/{pnr}", response_model=ResponseEnvelope)
async def get_pnr_status(pnr: str):
    clean_pnr = re.sub(r"\D", "", pnr)
    if len(clean_pnr) != 10:
        raise HTTPException(
            status_code=400,
            detail="Invalid PNR format. PNR must be exactly 10 numeric digits.",
        )

    try:
        res = await orchestrator.get_pnr_status(clean_pnr)
    except LiveDataUnavailable:
        raise HTTPException(
            status_code=503,
            detail="The PNR service is temporarily unavailable. Please try again shortly.",
        )
    if not res:
        raise HTTPException(status_code=404, detail=f"PNR {clean_pnr} not found or expired.")

    # PNR response returned transitively without database retention
    return ResponseEnvelope(data=res.model_dump(mode="json"))
