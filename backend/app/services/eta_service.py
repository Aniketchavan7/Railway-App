from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from app.schemas.status import RailwayStatus


class ETACalculator:
    @classmethod
    def calculate_eta(
        cls, status: RailwayStatus, target_station_code: str
    ) -> Dict[str, Any]:
        target = target_station_code.upper().strip()
        matched_halt = None
        for h in status.halts:
            if h.station_code.upper() == target or target in h.station_name.upper():
                matched_halt = h
                break

        now = datetime.now(timezone.utc)
        current_delay = status.delay_minutes
        current_loc = status.current_station or "In transit"

        if not matched_halt:
            return {
                "train_number": status.train_number,
                "train_name": status.train_name,
                "target_station": target,
                "current_location": current_loc,
                "current_delay_minutes": current_delay,
                "status_message": f"Station {target} is not in the scheduled halts list of {status.train_name} ({status.train_number}).",
                "reaches_target": False,
                "eta": None,
            }

        if matched_halt.has_arrived or matched_halt.has_departed:
            return {
                "train_number": status.train_number,
                "train_name": status.train_name,
                "target_station": matched_halt.station_name,
                "target_code": matched_halt.station_code,
                "current_location": current_loc,
                "current_delay_minutes": current_delay,
                "status_message": f"Train {status.train_number} has already passed {matched_halt.station_name}.",
                "reaches_target": True,
                "already_arrived": True,
                "platform": matched_halt.platform,
                "eta": matched_halt.actual_arrival or matched_halt.arrival_time,
            }

        # Calculate ETA based on scheduled arrival + current delay
        sch_arr_str = matched_halt.arrival_time or matched_halt.departure_time or "00:00"
        eta_note = f"Estimated arrival at {matched_halt.station_name} ({matched_halt.station_code}) with {current_delay} min delay."

        return {
            "train_number": status.train_number,
            "train_name": status.train_name,
            "target_station": matched_halt.station_name,
            "target_code": matched_halt.station_code,
            "current_location": current_loc,
            "current_delay_minutes": current_delay,
            "scheduled_arrival": sch_arr_str,
            "expected_arrival": f"{sch_arr_str} (+{current_delay}m)",
            "platform": matched_halt.platform or "1",
            "distance_km": matched_halt.distance_km,
            "reaches_target": True,
            "already_arrived": False,
            "is_simulated": status.is_simulated,
            "source_provider": status.source_provider,
            "observed_at": status.observed_at.isoformat(),
            "status_message": eta_note,
        }
