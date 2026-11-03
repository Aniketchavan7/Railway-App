from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class PassengerStatus(BaseModel):
    passenger_number: int
    booking_status: str       # e.g., "CNF", "RAC 12", "WL 45"
    current_status: str       # e.g., "CNF", "B2, 45", "RAC 4"
    coach: Optional[str] = None
    berth_number: Optional[int] = None
    berth_type: Optional[str] = None  # Lower, Middle, Upper, Side Lower, Side Upper


class PNRStatus(BaseModel):
    pnr: str
    train_number: str
    train_name: str
    journey_date: str
    from_station: str
    to_station: str
    boarding_station: str
    reserved_up_to: str
    reservation_class: str
    quota: str = "GN"
    chart_status: str = "CHART_NOT_PREPARED"  # CHART_PREPARED, CHART_NOT_PREPARED
    passengers: List[PassengerStatus] = Field(default_factory=list)
    source_provider: str
    is_simulated: bool = False
    verification_tier: str = "upstream_prs"  # upstream_prs, demo_record
    privacy_notice: str = (
        "PNR requests are processed transitively without storing personal passenger details."
    )

    @field_validator("pnr")
    @classmethod
    def validate_pnr(cls, v: str) -> str:
        clean_pnr = v.replace("-", "").strip()
        if not clean_pnr.isdigit() or len(clean_pnr) != 10:
            raise ValueError("PNR must be exactly 10 digits")
        return clean_pnr
