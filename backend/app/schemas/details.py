from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class CoachType(str, Enum):
    LOCO = "LOCO"
    GEN = "GEN"      # General unreserved / GS
    SLR = "SLR"      # Seating cum Luggage Rake / EOG / Guard
    SL = "SL"        # Sleeper class
    AC3 = "3A"       # AC 3 Tier
    AC3E = "3E"      # AC 3 Economy
    AC2 = "2A"       # AC 2 Tier
    AC1 = "1A"       # AC First Class
    CC = "CC"        # AC Chair Car
    EC = "EC"        # Executive Chair Car
    EV = "EV"        # Vistadome
    PANTRY = "PC"    # Pantry Car


class CoachPosition(BaseModel):
    position_number: int  # 1 to 24
    coach_code: str       # e.g., LOCO, SLR, GS, S1, B1, A1, H1
    coach_type: CoachType
    total_berths: int = 72
    deck_type: str = "SINGLE"  # SINGLE, DOUBLE


class CoachComposition(BaseModel):
    train_number: str
    train_name: str
    total_coaches: int
    coaches: List[CoachPosition] = Field(default_factory=list)
    source_provider: str
    is_simulated: bool = False


class PlatformInfo(BaseModel):
    station_code: str
    station_name: str
    train_number: str
    platform_number: Optional[str] = None
    confidence: str = "CONFIRMED"  # CONFIRMED, PROBABLE, HISTORICAL


class FareClassBreakdown(BaseModel):
    class_code: str  # 1A, 2A, 3A, 3E, CC, SL, 2S
    class_name: str
    base_fare: float
    reservation_charge: float
    superfast_charge: float
    gst: float
    tatkal_surcharge: float = 0.0
    total_fare: float


class FareEnquiryResult(BaseModel):
    train_number: str
    train_name: str
    origin_station: str
    destination_station: str
    distance_km: float
    quota: str = "GN"  # GN (General), TQ (Tatkal), PT (Premium Tatkal), SS (Senior Citizen), LD (Ladies)
    classes: List[FareClassBreakdown] = Field(default_factory=list)
    pricing_engine: str = "railway_board_telescopic_v2024"
    source_provider: str
    is_simulated: bool = False
