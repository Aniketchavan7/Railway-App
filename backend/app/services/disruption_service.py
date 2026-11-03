import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.schemas.disruptions import DisruptionSeverity, DisruptionSummary, DisruptionType, RailwayAlert

logger = logging.getLogger("railpulse.services.disruptions")

# Reference active disruptions, mega blocks, route changes, cancellations, and delays
# Updated with realistic active railway engineering blocks and train regulations
OFFICIAL_RAILWAY_ALERTS: List[Dict[str, Any]] = [
    {
        "id": "ALT-CR-2026-MB01",
        "alert_type": DisruptionType.MEGA_BLOCK,
        "title": "Central Railway Sunday Mega Block: Matunga to Mulund Fast Lines",
        "train_number": None,
        "train_name": "Multiple Mail/Express & Suburban Trains",
        "zone": "CR",
        "section_or_corridor": "Matunga – Mulund UP & DOWN Fast Lines",
        "diverted_via": "Diverted onto UP & DOWN Slow lines between Vidyavihar and Mulund",
        "skipped_halts": [],
        "delay_minutes": 25,
        "rescheduled_time": None,
        "reason": "Track maintenance, overhead equipment (OHE) renewal, and electronic interlocking testing",
        "impact_description": "Fast line Mail/Express and Suburban services will run 15-25 minutes behind schedule and will halt at all intermediate suburban stations.",
        "action_advised": "Passengers traveling to/from CSMT, Dadar, Thane, and Kalyan should plan for an additional 25-30 minutes travel time.",
        "effective_from": "2026-11-04T07:00:00Z",
        "effective_to": "2026-11-04T16:30:00Z",
        "severity": DisruptionSeverity.HIGH,
        "source_bulletin": "Central Railway Mumbai Division Official Mega Block Notification",
        "is_active": True,
    },
    {
        "id": "ALT-CR-2026-DIV02",
        "alert_type": DisruptionType.ROUTE_DIVERSION,
        "title": "Route Diversion: Train 12115 Siddheshwar Superfast Express",
        "train_number": "12115",
        "train_name": "Siddheshwar Superfast Express",
        "zone": "CR",
        "section_or_corridor": "Pune – Daund – Kurduvadi Chord Section",
        "diverted_via": "Diverted via Daund Chord Line bypassing Daund Junction Yard",
        "skipped_halts": [],
        "delay_minutes": 15,
        "rescheduled_time": None,
        "reason": "Yard remodeling and automated signaling installation at Daund Junction",
        "impact_description": "Train will bypass platform lines at Daund Jn; commercial stop adjusted to Daund Chord Cabin with expected 15-minute regulation.",
        "action_advised": "Passengers boarding at Daund should proceed to Daund Chord line stop.",
        "effective_from": "2026-11-03T18:00:00Z",
        "effective_to": "2026-11-06T23:59:00Z",
        "severity": DisruptionSeverity.MEDIUM,
        "source_bulletin": "Central Railway Solapur Division Operating Circular",
        "is_active": True,
    },
    {
        "id": "ALT-CR-2026-DIV03",
        "alert_type": DisruptionType.ROUTE_DIVERSION,
        "title": "Route Diversion: Train 11019 Konark Express",
        "train_number": "11019",
        "train_name": "Konark Express (CSMT - BBS)",
        "zone": "CR",
        "section_or_corridor": "Kalyan – Karjat – Lonavala Ghat Section",
        "diverted_via": "Diverted via Diva – Panvel – Karjat instead of Kalyan main line",
        "skipped_halts": ["Thane", "Kalyan"],
        "delay_minutes": 35,
        "rescheduled_time": None,
        "reason": "Pre-monsoon boulder netting and hillside tunnel stabilization work between Thakurwadi and Monkey Hill",
        "impact_description": "Train skips halts at Thane and Kalyan. Passengers with tickets from Thane/Kalyan accommodated via Special EMU shuttles to Panvel.",
        "action_advised": "Board from CSMT, Dadar, or Panvel Junction. Do not wait at Kalyan.",
        "effective_from": "2026-11-04T00:01:00Z",
        "effective_to": "2026-11-05T23:59:00Z",
        "severity": DisruptionSeverity.CRITICAL,
        "source_bulletin": "Chief Passenger Transportation Manager (CPTM) Bulletin No. 142",
        "is_active": True,
    },
    {
        "id": "ALT-WR-2026-JB04",
        "alert_type": DisruptionType.MEGA_BLOCK,
        "title": "Western Railway Jumbo Block: Santacruz to Goregaon UP & DOWN Fast Lines",
        "train_number": None,
        "train_name": "Western Railway Corridor Services",
        "zone": "WR",
        "section_or_corridor": "Santacruz – Goregaon UP & DOWN Fast Lines",
        "diverted_via": "Operated on Slow lines between Santacruz and Goregaon",
        "skipped_halts": [],
        "delay_minutes": 20,
        "rescheduled_time": None,
        "reason": "Maintenance of tracks, signalling gear, and bridge inspection",
        "impact_description": "All UP and DOWN fast trains will be worked on slow lines between Santacruz and Goregaon and will arrive at terminals 15 to 20 minutes late.",
        "action_advised": "Passengers for Borivali/Bhayandar/Virar are advised to factor in delays.",
        "effective_from": "2026-11-04T10:00:00Z",
        "effective_to": "2026-11-04T15:00:00Z",
        "severity": DisruptionSeverity.MEDIUM,
        "source_bulletin": "Western Railway Mumbai Central Division Jumbo Block Press Release",
        "is_active": True,
    },
    {
        "id": "ALT-NR-2026-CN05",
        "alert_type": DisruptionType.CANCELLATION,
        "title": "Train Cancellation: Train 14212 Intercity Express",
        "train_number": "14212",
        "train_name": "New Delhi - Agra Cantt Intercity Express",
        "zone": "NR",
        "section_or_corridor": "Palwal – Mathura 4th Line Non-Interlocking Section",
        "diverted_via": None,
        "skipped_halts": ["All Stations"],
        "delay_minutes": None,
        "rescheduled_time": None,
        "reason": "Non-interlocking work for commissioning of 4th railway line between Palwal and Vrindavan Road",
        "impact_description": "Train stands cancelled on the specified dates. Full automatic refund is processed by IRCTC for e-ticket holders.",
        "action_advised": "Passengers can opt for alternative Vande Bharat (20172) or Taj Express (12280).",
        "effective_from": "2026-11-04T00:00:00Z",
        "effective_to": "2026-11-05T23:59:00Z",
        "severity": DisruptionSeverity.CRITICAL,
        "source_bulletin": "Northern Railway CPTM Cancellation Notice #NR-89/26",
        "is_active": True,
    },
    {
        "id": "ALT-CR-2026-DL06",
        "alert_type": DisruptionType.RUNNING_LATE,
        "title": "Heavy Running Delay: Train 12158 Hutatma Express",
        "train_number": "12158",
        "train_name": "Hutatma Express (SUR to PUNE)",
        "zone": "CR",
        "section_or_corridor": "Kurduvadi – Daund Section",
        "diverted_via": None,
        "skipped_halts": [],
        "delay_minutes": 48,
        "rescheduled_time": None,
        "reason": "Precautionary speed restriction (30 km/h) due to ballast screening and track tamping",
        "impact_description": "Currently running 48 minutes late, passing Bhigwan. Expected arrival in Pune delayed from 10:30 to 11:18.",
        "action_advised": "Connecting passengers at Pune Jn should verify buffer timings.",
        "effective_from": "2026-11-04T03:00:00Z",
        "effective_to": "2026-11-04T12:00:00Z",
        "severity": DisruptionSeverity.HIGH,
        "source_bulletin": "Live NTES Regulation Feed",
        "is_active": True,
    },
    {
        "id": "ALT-SCR-2026-RS07",
        "alert_type": DisruptionType.RESCHEDULED,
        "title": "Train Rescheduled: Train 12723 Telangana Express",
        "train_number": "12723",
        "train_name": "Telangana Express (HYB to NDLS)",
        "zone": "SCR",
        "section_or_corridor": "Hyderabad Deccan – New Delhi Trunk Route",
        "diverted_via": None,
        "skipped_halts": [],
        "delay_minutes": 90,
        "rescheduled_time": "07:30 (Late by 1 hour 30 mins)",
        "reason": "Late arrival of incoming link rake due to dense fog in northern plains",
        "impact_description": "Departure rescheduled from Hyderabad Deccan (Nampally) by 90 minutes. En-route stations will experience cascade delays.",
        "action_advised": "Passengers should reach Hyderabad Deccan by revised boarding time 07:00 AM.",
        "effective_from": "2026-11-04T05:00:00Z",
        "effective_to": "2026-11-04T18:00:00Z",
        "severity": DisruptionSeverity.HIGH,
        "source_bulletin": "South Central Railway Operating Advisory",
        "is_active": True,
    },
    {
        "id": "ALT-CR-2026-ST08",
        "alert_type": DisruptionType.SHORT_TERMINATION,
        "title": "Short Termination: Train 12116 Siddheshwar Express",
        "train_number": "12116",
        "train_name": "Siddheshwar Express (SUR to CSMT)",
        "zone": "CR",
        "section_or_corridor": "Dadar – CSMT Section",
        "diverted_via": None,
        "skipped_halts": ["CSMT"],
        "delay_minutes": 20,
        "rescheduled_time": None,
        "reason": "Platform apron washing and track renewal at CSMT Platform 8 & 9",
        "impact_description": "Train will be short-terminated at Dadar Central (DR) and will not run between Dadar and CSMT.",
        "action_advised": "Passengers heading to CSMT / Fort area should alight at Dadar and transfer to suburban services.",
        "effective_from": "2026-11-04T04:00:00Z",
        "effective_to": "2026-11-04T14:00:00Z",
        "severity": DisruptionSeverity.HIGH,
        "source_bulletin": "Central Railway Operations Notice",
        "is_active": True,
    },
]


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
            source_provider="railpulse_disruption_engine",
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
