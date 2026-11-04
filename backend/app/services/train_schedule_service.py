from datetime import datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from app.schemas.status import (
    ConfidenceLevel,
    FreshnessState,
    LocationType,
    RailwayStatus,
    StationHalt,
)

# Indian Standard Time (UTC+05:30)
IST = timezone(timedelta(hours=5, minutes=30))

DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]


class TrainOperationsMetadata:
    """Authentic operational days, pairing rakes, and timetables for Indian Railways trains."""

    TRAIN_PROFILES: Dict[str, Dict[str, Any]] = {
        # 22225 Mumbai CSMT - Solapur Vande Bharat Express
        # Runs 6 days a week, DOES NOT RUN ON WEDNESDAY (Maintenance Day)
        "22225": {
            "number": "22225",
            "name": "Solapur Vande Bharat Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "SUR",
            "destination_name": "Solapur Jn",
            "days_of_run": ["MON", "TUE", "THU", "FRI", "SAT", "SUN"],  # NO WED
            "non_running_days": ["WED"],
            "non_running_reason": "Weekly Primary Maintenance at Wadi Bunder Yard (Mumbai)",
            "dep_time": "16:05",
            "arr_time": "22:40",
            "pairing_train": "22226",
            "rake_share_description": "Shares rake with 22226 (Solapur to CSMT). 22226 operates in the morning (06:05-12:35), turns around at CSMT, and operates as 22225 in the evening (16:05-22:40).",
            "mps_speed": 130,
        },
        # 22226 Solapur - Mumbai CSMT Vande Bharat Express
        # Runs 6 days a week, DOES NOT RUN ON WEDNESDAY
        "22226": {
            "number": "22226",
            "name": "Mumbai CSMT Vande Bharat Express",
            "origin": "SUR",
            "origin_name": "Solapur Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "THU", "FRI", "SAT", "SUN"],  # NO WED
            "non_running_days": ["WED"],
            "non_running_reason": "Weekly Primary Maintenance at Wadi Bunder Yard (Mumbai)",
            "dep_time": "06:05",
            "arr_time": "12:35",
            "pairing_train": "22225",
            "rake_share_description": "Shares rake with 22225. Operates from Solapur in the morning, arrives at CSMT at 12:35, turns around and departs as 22225 at 16:05 back to Solapur.",
            "mps_speed": 130,
        },
        # 12158 Hutatma Express (Solapur to Pune) - DAILY (Morning)
        "12158": {
            "number": "12158",
            "name": "Hutatma Express",
            "origin": "SUR",
            "origin_name": "Solapur Jn",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "06:30",
            "arr_time": "10:30",
            "pairing_train": "12157",
            "rake_share_description": "Single dedicated LHB rake. Operates as 12158 in the morning (06:30-10:30) Solapur to Pune. The rake rests at Pune and turns around to operate as 12157 in the evening (18:00-22:00) back to Solapur.",
            "mps_speed": 110,
        },
        # 12157 Hutatma Express (Pune to Solapur) - DAILY (Evening)
        "12157": {
            "number": "12157",
            "name": "Hutatma Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "SUR",
            "destination_name": "Solapur Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "18:00",
            "arr_time": "22:00",
            "pairing_train": "12158",
            "rake_share_description": "Single dedicated LHB rake. Arrives at Pune in the morning as 12158 at 10:30. In the evening, the same rake operates as 12157 departing Pune at 18:00 back to Solapur.",
            "mps_speed": 110,
        },
        # 12115 Siddheshwar Superfast Express (Mumbai CSMT to Solapur) - DAILY (Overnight)
        "12115": {
            "number": "12115",
            "name": "Siddheshwar Superfast Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "SUR",
            "destination_name": "Solapur Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "22:40",
            "arr_time": "06:45",
            "pairing_train": "12116",
            "rake_share_description": "Operates overnight. Leaves CSMT at 22:40, reaches Solapur at 06:45. Returns as 12116 leaving Solapur at 22:30 reaching CSMT at 06:50.",
            "mps_speed": 110,
        },
        # 12116 Siddheshwar Superfast Express (Solapur to Mumbai CSMT) - DAILY (Overnight)
        "12116": {
            "number": "12116",
            "name": "Siddheshwar Superfast Express",
            "origin": "SUR",
            "origin_name": "Solapur Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "22:30",
            "arr_time": "06:50",
            "pairing_train": "12115",
            "rake_share_description": "Operates overnight. Leaves Solapur at 22:30, reaches CSMT at 06:50. Daytime is spent in depot cleaning.",
            "mps_speed": 110,
        },
        # 12101 Jnaneswari Superfast Express (LTT to Shalimar) - 4 Days
        "12101": {
            "number": "12101",
            "name": "Jnaneswari Superfast Express",
            "origin": "LTT",
            "origin_name": "Mumbai LTT",
            "destination": "SHM",
            "destination_name": "Kolkata Shalimar",
            "days_of_run": ["MON", "TUE", "FRI", "SAT"],
            "non_running_days": ["WED", "THU", "SUN"],
            "non_running_reason": "Operates 4 days a week (Mon, Tue, Fri, Sat only).",
            "dep_time": "20:35",
            "arr_time": "03:20",
            "pairing_train": "12102",
            "rake_share_description": "Operates on Mon, Tue, Fri, Sat. Pairs with 12102 returning from Shalimar on Mon, Wed, Thu, Sun.",
            "mps_speed": 110,
        },
        # 22436 Vande Bharat Express (New Delhi to Varanasi) - 5 Days
        "22436": {
            "number": "22436",
            "name": "Vande Bharat Express",
            "origin": "NDLS",
            "origin_name": "New Delhi",
            "destination": "BSB",
            "destination_name": "Varanasi Jn",
            "days_of_run": ["TUE", "WED", "FRI", "SAT", "SUN"],
            "non_running_days": ["MON", "THU"],
            "non_running_reason": "Operates 5 days a week (Except Monday and Thursday).",
            "dep_time": "06:00",
            "arr_time": "14:00",
            "pairing_train": "22435",
            "rake_share_description": "Pairs with 22435 returning from Varanasi at 15:00 reaching NDLS at 23:00.",
            "mps_speed": 130,
        },
        # 12951 Mumbai Tejas Rajdhani Express (Mumbai to New Delhi) - DAILY
        "12951": {
            "number": "12951",
            "name": "Mumbai Tejas Rajdhani Express",
            "origin": "MMCT",
            "origin_name": "Mumbai Central",
            "destination": "NDLS",
            "destination_name": "New Delhi",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "17:00",
            "arr_time": "08:32",
            "pairing_train": "12952",
            "rake_share_description": "Daily premium overnight express. Pairs with 12952 returning from New Delhi at 16:55.",
            "mps_speed": 130,
        },
    }

    @classmethod
    def get_profile(cls, train_number: str) -> Optional[Dict[str, Any]]:
        clean_num = str(train_number).strip()
        return cls.TRAIN_PROFILES.get(clean_num)

    @classmethod
    def check_operational_status(
        cls, train_number: str, query_dt: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Evaluate if a train runs on a given date/time, its service state,
        and its relationship with its pairing rake.
        """
        now_ist = query_dt.astimezone(IST) if query_dt else datetime.now(IST)
        day_str = DAY_NAMES[now_ist.weekday()]
        current_time_str = now_ist.strftime("%H:%M")

        profile = cls.get_profile(train_number)

        # Default fallback for unindexed trains
        if not profile:
            return {
                "train_number": str(train_number),
                "runs_today": True,
                "days_of_run": DAY_NAMES,
                "service_state": "RUNNING",
                "running_status": "Running (Schedule Verification Required)",
                "service_notice": None,
                "pairing_train": None,
            }

        days_of_run = profile["days_of_run"]
        runs_today = day_str in days_of_run

        # Case 1: Train does NOT operate on this day
        if not runs_today:
            day_full = now_ist.strftime("%A")
            return {
                "train_number": profile["number"],
                "train_name": profile["name"],
                "runs_today": False,
                "days_of_run": days_of_run,
                "service_state": "NOT_RUNNING_TODAY",
                "running_status": f"Does Not Run on {day_full}s",
                "service_notice": f"Train {profile['number']} ({profile['name']}) operates on {', '.join(days_of_run)}. No service on {day_full} ({profile.get('non_running_reason') or 'Weekly Maintenance'}).",
                "pairing_train": profile.get("pairing_train"),
                "rake_share_description": profile.get("rake_share_description"),
            }

        # Case 2: Train runs today. Evaluate temporal time window against schedule.
        dep_time = profile["dep_time"]
        arr_time = profile["arr_time"]
        is_overnight = arr_time < dep_time  # e.g., 22:40 to 06:45

        # Check if train has NOT started yet
        # If departure is in the future today
        if not is_overnight and current_time_str < dep_time:
            # Has not started yet
            return {
                "train_number": profile["number"],
                "train_name": profile["name"],
                "runs_today": True,
                "days_of_run": days_of_run,
                "service_state": "NOT_STARTED",
                "running_status": f"Scheduled to Depart {profile['origin_name']} at {dep_time} IST",
                "service_notice": f"Upcoming service today. Scheduled departure from {profile['origin_name']} at {dep_time} IST. Destination {profile['destination_name']} at {arr_time} IST.",
                "pairing_train": profile.get("pairing_train"),
                "rake_share_description": profile.get("rake_share_description"),
            }

        # Check if train has already COMPLETED its run today
        # For daytime train: if current time is after arrival + 30 mins
        if not is_overnight and current_time_str > arr_time:
            return {
                "train_number": profile["number"],
                "train_name": profile["name"],
                "runs_today": True,
                "days_of_run": days_of_run,
                "service_state": "COMPLETED",
                "running_status": f"Journey Completed at {profile['destination_name']} ({arr_time} IST)",
                "service_notice": f"Train {profile['number']} has completed its scheduled run at {profile['destination_name']}. {profile.get('rake_share_description') or ''}",
                "pairing_train": profile.get("pairing_train"),
                "rake_share_description": profile.get("rake_share_description"),
            }

        # Case 3: Currently within running window
        return {
            "train_number": profile["number"],
            "train_name": profile["name"],
            "runs_today": True,
            "days_of_run": days_of_run,
            "service_state": "RUNNING",
            "running_status": f"En Route ({profile['origin_name']} to {profile['destination_name']})",
            "service_notice": f"Actively running service. Departure: {dep_time} IST • Expected Arrival: {arr_time} IST.",
            "pairing_train": profile.get("pairing_train"),
            "rake_share_description": profile.get("rake_share_description"),
        }
