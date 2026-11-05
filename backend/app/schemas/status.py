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
    # Random per-trip value generated in the browser. Not tied to a person or device.
    reporter_id: str = Field(min_length=8, max_length=64)
    # Bounds also reject NaN and infinity, which would break formatting for every viewer.
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    speed_kmph: Optional[float] = Field(default=None, ge=0, le=400)
    accuracy_meters: Optional[float] = Field(default=None, ge=0, le=100000)
    heading: Optional[float] = Field(default=None, ge=0, le=360)


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
    # None means we do not know, rather than assuming the train runs daily.
    runs_today: Optional[bool] = None
    days_of_run: List[str] = Field(default_factory=list)
    # RUNNING, NOT_STARTED, COMPLETED, NOT_RUNNING_TODAY, CANCELLED, UNKNOWN
    service_state: str = "RUNNING"
    service_notice: Optional[str] = None
    pairing_train_number: Optional[str] = None
    # Journey being reported, e.g. "Wed 4 Nov" for a train that started yesterday
    journey_date_label: Optional[str] = None
    also_running_note: Optional[str] = None
    next_run_date: Optional[str] = None
    origin_code: Optional[str] = None
    origin_name: Optional[str] = None
    destination_code: Optional[str] = None
    destination_name: Optional[str] = None
    previous_station_code: Optional[str] = None
    current_station_code: Optional[str] = None
    next_station_code: Optional[str] = None
    next_eta: Optional[datetime] = None
    route_progress_percent: Optional[float] = None
    # PASSENGER_GPS, PROVIDER_GPS, ESTIMATED, STATION, SCHEDULED, NONE
    position_basis: str = "NONE"
    position_label: Optional[str] = None
    crowd_reporters: int = 0
    exceptions: List[Dict[str, Any]] = Field(default_factory=list)


class ResponseEnvelope(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    meta: Dict[str, Any] = Field(default_factory=dict)
