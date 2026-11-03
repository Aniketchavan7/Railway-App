from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class DisruptionType(str, Enum):
    MEGA_BLOCK = "MEGA_BLOCK"
    ROUTE_DIVERSION = "ROUTE_DIVERSION"
    CANCELLATION = "CANCELLATION"
    RESCHEDULED = "RESCHEDULED"
    RUNNING_LATE = "RUNNING_LATE"
    SHORT_TERMINATION = "SHORT_TERMINATION"
    SAFETY_REGULATION = "SAFETY_REGULATION"


class DisruptionSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    ADVISORY = "ADVISORY"


class RailwayAlert(BaseModel):
    id: str
    alert_type: DisruptionType
    title: str
    train_number: Optional[str] = None
    train_name: Optional[str] = None
    zone: str = "CR"  # CR, WR, NR, ECR, SCR, etc.
    section_or_corridor: str
    diverted_via: Optional[str] = None
    skipped_halts: List[str] = Field(default_factory=list)
    delay_minutes: Optional[int] = None
    rescheduled_time: Optional[str] = None
    reason: str
    impact_description: str
    action_advised: str
    effective_from: str
    effective_to: str
    severity: DisruptionSeverity = DisruptionSeverity.HIGH
    source_bulletin: str = "Indian Railways Official Operations Notice"
    is_active: bool = True


class DisruptionSummary(BaseModel):
    total_active_alerts: int
    mega_blocks_count: int
    diverted_trains_count: int
    cancelled_trains_count: int
    delayed_trains_count: int
    alerts: List[RailwayAlert] = Field(default_factory=list)
    generated_at: str
    source_provider: str = "railpulse_disruption_engine"
