import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.disruptions import DisruptionSeverity, DisruptionSummary, DisruptionType, RailwayAlert

logger = logging.getLogger("railpulse.services.disruptions")

# There is no verified network-wide alert feed yet, so this stays empty. Train-level
# cancellations and diversions come from the provider, in RailwayStatus.exceptions.
# Do not add hand-written notices here: passengers act on them.
OFFICIAL_RAILWAY_ALERTS: List[Dict[str, Any]] = []


class DisruptionService:
    """
    Intelligent Aggregator for Indian Railways Mega Blocks, Route Diversions,
    Train Cancellations, Rescheduled Services, and Heavy Delays.
    """

    @classmethod
    def get_all_alerts(
        cls,
        alert_type: Optional[str] = None,
        zone: Optional[str] = None,
        train_number: Optional[str] = None,
        station: Optional[str] = None,
    ) -> List[RailwayAlert]:
        alerts = [RailwayAlert(**a) for a in OFFICIAL_RAILWAY_ALERTS]

        if alert_type:
            at_upper = alert_type.upper().strip()
            alerts = [a for a in alerts if a.alert_type.value == at_upper or at_upper in a.alert_type.value]

        if zone:
            z_upper = zone.upper().strip()
            alerts = [a for a in alerts if a.zone.upper() == z_upper]

        if train_number:
            t_clean = train_number.strip()
            alerts = [a for a in alerts if a.train_number == t_clean or (a.train_number is None and t_clean in a.impact_description)]

        if station:
            st_upper = station.upper().strip()
            alerts = [
                a for a in alerts
                if st_upper in a.section_or_corridor.upper()
                or st_upper in a.impact_description.upper()
                or st_upper in [h.upper() for h in a.skipped_halts]
            ]

        return alerts

    @classmethod
    def get_disruption_summary(
        cls,
        alert_type: Optional[str] = None,
        zone: Optional[str] = None,
        train_number: Optional[str] = None,
        station: Optional[str] = None,
    ) -> DisruptionSummary:
        alerts = cls.get_all_alerts(alert_type, zone, train_number, station)
        mega_blocks = sum(1 for a in alerts if a.alert_type == DisruptionType.MEGA_BLOCK)
        diverted = sum(1 for a in alerts if a.alert_type == DisruptionType.ROUTE_DIVERSION)
        cancelled = sum(1 for a in alerts if a.alert_type in (DisruptionType.CANCELLATION, DisruptionType.SHORT_TERMINATION))
        delayed = sum(1 for a in alerts if a.alert_type in (DisruptionType.RUNNING_LATE, DisruptionType.RESCHEDULED))

        return DisruptionSummary(
            total_active_alerts=len(alerts),
            mega_blocks_count=mega_blocks,
            diverted_trains_count=diverted,
            cancelled_trains_count=cancelled,
            delayed_trains_count=delayed,
            alerts=alerts,
            generated_at=datetime.now(timezone.utc).isoformat(),
            source_provider="no_verified_source",
        )

    @classmethod
    def get_train_disruptions(cls, train_number: str) -> List[RailwayAlert]:
        """Check all disruptions affecting a specific train number directly or via its corridor."""
        t_clean = train_number.strip()
        matched: List[RailwayAlert] = []
        for a_dict in OFFICIAL_RAILWAY_ALERTS:
            alert = RailwayAlert(**a_dict)
            if alert.train_number == t_clean:
                matched.append(alert)
            elif alert.train_number is None:
                # Check if corridor alert mentions this train
                if t_clean in alert.impact_description or t_clean in alert.title:
                    matched.append(alert)
        return matched

    @classmethod
    def get_corridor_mega_blocks(cls, station_or_zone: Optional[str] = None) -> List[RailwayAlert]:
        """Fetch all active Mega Blocks and Jumbo Blocks for a station or zone."""
        all_blocks = [
            RailwayAlert(**a) for a in OFFICIAL_RAILWAY_ALERTS
            if a["alert_type"] == DisruptionType.MEGA_BLOCK
        ]
        if not station_or_zone:
            return all_blocks

        query = station_or_zone.upper().strip()
        return [
            b for b in all_blocks
            if query in b.zone.upper()
            or query in b.section_or_corridor.upper()
            or query in b.title.upper()
        ]
