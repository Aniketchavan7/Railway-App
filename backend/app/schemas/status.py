from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FreshnessState(str, Enum):
    LIVE = "LIVE"
    RECENT = "RECENT"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"


class LocationType(str, Enum):
    GPS_OBSERVED = "GPS_OBSERVED"
    STATION_OBSERVED = "STATION_OBSERVED"
    PROVIDER_ESTIMATED = "PROVIDER_ESTIMATED"
    APPLICATION_ESTIMATED = "APPLICATION_ESTIMATED"
    SIMULATED = "SIMULATED"
    UNKNOWN = "UNKNOWN"


class StationHalt(BaseModel):
    station_code: str
    station_name: str
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    actual_arrival: Optional[str] = None
    actual_departure: Optional[str] = None
    distance_km: float = 0.0
    day_count: int = 1
    platform: Optional[str] = None
    delay_minutes: int = 0
    has_arrived: bool = False
    has_departed: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class PassengerTelemetryReport(BaseModel):
    latitude: float
    longitude: float
    speed_kmph: Optional[float] = None
    accuracy_meters: Optional[float] = None
    heading: Optional[float] = None


class RailwayStatus(BaseModel):
    train_number: str
    train_name: str
    journey_date: str
    running_status: str
    delay_minutes: int = 0
    current_station: Optional[str] = None
    previous_station: Optional[str] = None
    next_station: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed_kmph: Optional[float] = None
    expected_arrival: Optional[datetime] = None
    expected_departure: Optional[datetime] = None
    source_provider: str
    observed_at: datetime
    fetched_at: datetime
    age_seconds: int
    freshness: FreshnessState
    confidence: ConfidenceLevel
    location_type: LocationType
    is_simulated: bool = False
    halts: List[StationHalt] = Field(default_factory=list)
    runs_today: bool = True
    days_of_run: List[str] = Field(default_factory=lambda: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])
    service_state: str = "RUNNING"  # RUNNING, NOT_RUNNING_TODAY, NOT_STARTED, COMPLETED
    service_notice: Optional[str] = None
    pairing_train_number: Optional[str] = None


class ResponseEnvelope(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
