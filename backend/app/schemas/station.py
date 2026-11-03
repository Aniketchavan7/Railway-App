from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Station(BaseModel):
    station_code: str
    station_name: str
    state: Optional[str] = None
    zone: Optional[str] = None
    division: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    number_of_platforms: Optional[int] = 1


class StationBoardItem(BaseModel):
    train_number: str
    train_name: str
    origin: str
    destination: str
    scheduled_arrival: Optional[str] = None
    expected_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    expected_departure: Optional[str] = None
    delay_arrival_minutes: int = 0
    delay_departure_minutes: int = 0
    platform: Optional[str] = None
    status: str = "SCHEDULED"  # AT_STATION, UPCOMING, DEPARTED, SCHEDULED


class StationLiveBoard(BaseModel):
    station_code: str
    station_name: str
    window_hours: int = 4
    updated_at: datetime
    trains: List[StationBoardItem] = Field(default_factory=list)
    source_provider: str
    is_simulated: bool = False
