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
        # Runs 6 days a week, DOES NOT RUN ON THURSDAY (Maintenance Day)
        "22226": {
            "number": "22226",
            "name": "Mumbai CSMT Vande Bharat Express",
            "origin": "SUR",
            "origin_name": "Solapur Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "FRI", "SAT", "SUN"],  # NO THU
            "non_running_days": ["THU"],
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
        # 12102 Jnaneswari Super Deluxe Express (Shalimar to LTT) - 4 Days
        "12102": {
            "number": "12102",
            "name": "Jnaneswari Super Deluxe Express",
            "origin": "SHM",
            "origin_name": "Kolkata Shalimar",
            "destination": "LTT",
            "destination_name": "Mumbai LTT",
            "days_of_run": ["MON", "WED", "THU", "SUN"],
            "non_running_days": ["TUE", "FRI", "SAT"],
            "non_running_reason": "Operates 4 days a week (Mon, Wed, Thu, Sun only).",
            "dep_time": "20:20",
            "arr_time": "04:15",
            "pairing_train": "12101",
            "rake_share_description": "Operates on Mon, Wed, Thu, Sun. Pairs with 12101 returning from LTT on Mon, Tue, Fri, Sat.",
            "mps_speed": 110,
        },
        # 22436 Vande Bharat Express (New Delhi to Varanasi) - 6 Days
        "22436": {
            "number": "22436",
            "name": "Vande Bharat Express",
            "origin": "NDLS",
            "origin_name": "New Delhi",
            "destination": "BSB",
            "destination_name": "Varanasi Jn",
            "days_of_run": ["MON", "TUE", "WED", "FRI", "SAT", "SUN"],
            "non_running_days": ["THU"],
            "non_running_reason": "Operates 6 days a week (Except Thursday maintenance day).",
            "dep_time": "06:00",
            "arr_time": "14:00",
            "pairing_train": "22435",
            "rake_share_description": "Pairs with 22435 returning from Varanasi at 15:00 reaching NDLS at 23:00.",
            "mps_speed": 130,
        },
        # 22435 Vande Bharat Express (Varanasi to New Delhi) - 6 Days
        "22435": {
            "number": "22435",
            "name": "Vande Bharat Express",
            "origin": "BSB",
            "origin_name": "Varanasi Jn",
            "destination": "NDLS",
            "destination_name": "New Delhi",
            "days_of_run": ["MON", "TUE", "WED", "FRI", "SAT", "SUN"],
            "non_running_days": ["THU"],
            "non_running_reason": "Operates 6 days a week (Except Thursday maintenance day).",
            "dep_time": "15:00",
            "arr_time": "23:00",
            "pairing_train": "22436",
            "rake_share_description": "Single dedicated Vande Bharat rake. Arrives at Varanasi as 22436 at 14:00 and departs as 22435 at 15:00 back to New Delhi.",
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
        # 12952 New Delhi Mumbai Tejas Rajdhani Express (New Delhi to Mumbai) - DAILY
        "12952": {
            "number": "12952",
            "name": "New Delhi Mumbai Tejas Rajdhani Express",
            "origin": "NDLS",
            "origin_name": "New Delhi",
            "destination": "MMCT",
            "destination_name": "Mumbai Central",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "16:55",
            "arr_time": "08:35",
            "pairing_train": "12951",
            "rake_share_description": "Daily premium overnight express. Pairs with 12951 returning from Mumbai Central at 17:00.",
            "mps_speed": 130,
        },
        # 12123 Deccan Queen Superfast Express (CSMT to Pune) - DAILY
        "12123": {
            "number": "12123",
            "name": "Deccan Queen Superfast Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "17:10",
            "arr_time": "20:25",
            "pairing_train": "12124",
            "rake_share_description": "Dedicated LHB rake. Departs CSMT at 17:10, returns as 12124 from Pune at 07:15 the next morning.",
            "mps_speed": 110,
        },
        # 12124 Deccan Queen Superfast Express (Pune to CSMT) - DAILY
        "12124": {
            "number": "12124",
            "name": "Deccan Queen Superfast Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "07:15",
            "arr_time": "10:25",
            "pairing_train": "12123",
            "rake_share_description": "Morning express to Mumbai. Departs Pune 07:15, arrives CSMT 10:25, returns as 12123 at 17:10.",
            "mps_speed": 110,
        },
        # 12125 Pragati Express (CSMT to Pune) - DAILY
        "12125": {
            "number": "12125",
            "name": "Pragati Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "16:25",
            "arr_time": "19:50",
            "pairing_train": "12126",
            "rake_share_description": "Pairs with 12126 returning from Pune in morning.",
            "mps_speed": 110,
        },
        # 12126 Pragati Express (Pune to CSMT) - DAILY
        "12126": {
            "number": "12126",
            "name": "Pragati Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "07:50",
            "arr_time": "11:25",
            "pairing_train": "12125",
            "rake_share_description": "Pairs with 12125 returning from CSMT in evening.",
            "mps_speed": 110,
        },
        # 12127 Mumbai Pune Intercity Express - DAILY
        "12127": {
            "number": "12127",
            "name": "Mumbai Pune Intercity Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "06:40",
            "arr_time": "09:57",
            "pairing_train": "12128",
            "rake_share_description": "Pairs with 12128 returning from Pune at 17:55.",
            "mps_speed": 110,
        },
        # 12128 Pune Mumbai Intercity Express - DAILY
        "12128": {
            "number": "12128",
            "name": "Pune Mumbai Intercity Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "17:55",
            "arr_time": "21:05",
            "pairing_train": "12127",
            "rake_share_description": "Pairs with 12127 arriving from CSMT in morning.",
            "mps_speed": 110,
        },
        # 11007 Deccan Express (CSMT to Pune) - DAILY
        "11007": {
            "number": "11007",
            "name": "Deccan Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "07:00",
            "arr_time": "11:05",
            "pairing_train": "11008",
            "rake_share_description": "Pairs with 11008 returning from Pune at 15:15.",
            "mps_speed": 110,
        },
        # 11008 Deccan Express (Pune to CSMT) - DAILY
        "11008": {
            "number": "11008",
            "name": "Deccan Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "15:15",
            "arr_time": "19:05",
            "pairing_train": "11007",
            "rake_share_description": "Pairs with 11007 arriving from CSMT at 11:05.",
            "mps_speed": 110,
        },
        # 11009 Sinhagad Express (CSMT to Pune) - DAILY
        "11009": {
            "number": "11009",
            "name": "Sinhagad Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "PUNE",
            "destination_name": "Pune Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "17:50",
            "arr_time": "21:30",
            "pairing_train": "11010",
            "rake_share_description": "Pairs with 11010 returning from Pune at 06:05 next morning.",
            "mps_speed": 110,
        },
        # 11010 Sinhagad Express (Pune to CSMT) - DAILY
        "11010": {
            "number": "11010",
            "name": "Sinhagad Express",
            "origin": "PUNE",
            "origin_name": "Pune Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "06:05",
            "arr_time": "09:55",
            "pairing_train": "11009",
            "rake_share_description": "Pairs with 11009 arriving from CSMT in evening.",
            "mps_speed": 110,
        },
        # 12919 Malwa Superfast Express (DADN to SVDK) - DAILY
        "12919": {
            "number": "12919",
            "name": "Malwa Superfast Express",
            "origin": "DADN",
            "origin_name": "Dr. Ambedkar Nagar",
            "destination": "SVDK",
            "destination_name": "Shri Mata Vaishno Devi Katra",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "12:15",
            "arr_time": "16:15",
            "pairing_train": "12920",
            "rake_share_description": "Pairs with 12920 returning from Katra.",
            "mps_speed": 110,
        },
        # 12920 Malwa Superfast Express (SVDK to DADN) - DAILY
        "12920": {
            "number": "12920",
            "name": "Malwa Superfast Express",
            "origin": "SVDK",
            "origin_name": "Shri Mata Vaishno Devi Katra",
            "destination": "DADN",
            "destination_name": "Dr. Ambedkar Nagar",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "08:35",
            "arr_time": "12:45",
            "pairing_train": "12919",
            "rake_share_description": "Pairs with 12919 departing DADN.",
            "mps_speed": 110,
        },
        # 12009 Mumbai Ahmedabad Shatabdi Express (MMCT to ADI) - 6 Days (No Sun)
        "12009": {
            "number": "12009",
            "name": "Mumbai Ahmedabad Shatabdi Express",
            "origin": "MMCT",
            "origin_name": "Mumbai Central",
            "destination": "ADI",
            "destination_name": "Ahmedabad Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
            "non_running_days": ["SUN"],
            "non_running_reason": "Operates 6 days a week (No Sunday service).",
            "dep_time": "06:20",
            "arr_time": "12:45",
            "pairing_train": "12010",
            "rake_share_description": "Pairs with 12010 returning from Ahmedabad at 15:10.",
            "mps_speed": 130,
        },
        # 12010 Ahmedabad Mumbai Shatabdi Express (ADI to MMCT) - 6 Days (No Sun)
        "12010": {
            "number": "12010",
            "name": "Ahmedabad Mumbai Shatabdi Express",
            "origin": "ADI",
            "origin_name": "Ahmedabad Jn",
            "destination": "MMCT",
            "destination_name": "Mumbai Central",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
            "non_running_days": ["SUN"],
            "non_running_reason": "Operates 6 days a week (No Sunday service).",
            "dep_time": "15:10",
            "arr_time": "21:45",
            "pairing_train": "12009",
            "rake_share_description": "Pairs with 12009 arriving from Mumbai Central at 12:45.",
            "mps_speed": 130,
        },
        # 12051 Jan Shatabdi Express (CSMT to MAO) - DAILY
        "12051": {
            "number": "12051",
            "name": "Jan Shatabdi Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "MAO",
            "destination_name": "Madgaon Jn",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "05:10",
            "arr_time": "16:30",
            "pairing_train": "12052",
            "rake_share_description": "Pairs with 12052 returning from Madgaon.",
            "mps_speed": 110,
        },
        # 12052 Jan Shatabdi Express (MAO to CSMT) - DAILY
        "12052": {
            "number": "12052",
            "name": "Jan Shatabdi Express",
            "origin": "MAO",
            "origin_name": "Madgaon Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "non_running_days": [],
            "non_running_reason": None,
            "dep_time": "15:05",
            "arr_time": "23:55",
            "pairing_train": "12051",
            "rake_share_description": "Pairs with 12051 arriving from CSMT.",
            "mps_speed": 110,
        },
        # 12261 Howrah Mumbai CSMT Duronto Express (CSMT to HWH) - 4 Days
        "12261": {
            "number": "12261",
            "name": "Howrah Mumbai CSMT Duronto Express",
            "origin": "CSMT",
            "origin_name": "Mumbai CSMT",
            "destination": "HWH",
            "destination_name": "Howrah Jn",
            "days_of_run": ["TUE", "WED", "THU", "SUN"],
            "non_running_days": ["MON", "FRI", "SAT"],
            "non_running_reason": "Operates 4 days a week (Tue, Wed, Thu, Sun only).",
            "dep_time": "17:15",
            "arr_time": "20:15",
            "pairing_train": "12262",
            "rake_share_description": "Pairs with 12262 returning from Howrah.",
            "mps_speed": 120,
        },
        # 12262 Mumbai CSMT Howrah Duronto Express (HWH to CSMT) - 4 Days
        "12262": {
            "number": "12262",
            "name": "Mumbai CSMT Howrah Duronto Express",
            "origin": "HWH",
            "origin_name": "Howrah Jn",
            "destination": "CSMT",
            "destination_name": "Mumbai CSMT",
            "days_of_run": ["MON", "TUE", "WED", "FRI"],
            "non_running_days": ["THU", "SAT", "SUN"],
            "non_running_reason": "Operates 4 days a week (Mon, Tue, Wed, Fri only).",
            "dep_time": "05:45",
            "arr_time": "08:15",
            "pairing_train": "12261",
            "rake_share_description": "Pairs with 12261 arriving from CSMT.",
            "mps_speed": 120,
        },
        # 12301 Howrah Rajdhani Express (HWH to NDLS) - 6 Days (No Sun)
        "12301": {
            "number": "12301",
            "name": "Howrah Rajdhani Express",
            "origin": "HWH",
            "origin_name": "Howrah Jn",
            "destination": "NDLS",
            "destination_name": "New Delhi",
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
            "non_running_days": ["SUN"],
            "non_running_reason": "Operates 6 days a week (No Sunday departure).",
            "dep_time": "16:50",
            "arr_time": "10:05",
            "pairing_train": "12302",
            "rake_share_description": "Pairs with 12302 returning from New Delhi.",
            "mps_speed": 130,
        },
        # 12302 Howrah Rajdhani Express (NDLS to HWH) - 6 Days (No Sat)
        "12302": {
            "number": "12302",
            "name": "Howrah Rajdhani Express",
            "origin": "NDLS",
            "origin_name": "New Delhi",
            "destination": "HWH",
            "destination_name": "Howrah Jn",
            "days_of_run": ["SUN", "MON", "TUE", "WED", "THU", "FRI"],
            "non_running_days": ["SAT"],
            "non_running_reason": "Operates 6 days a week (No Saturday departure).",
            "dep_time": "16:50",
            "arr_time": "09:55",
            "pairing_train": "12301",
            "rake_share_description": "Pairs with 12301 arriving from Howrah.",
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

    @classmethod
    def get_trains_between_stations(
        cls, from_station: str, to_station: str
    ) -> List[Dict[str, Any]]:
        """Find authentic express trains connecting two station codes."""
        f = from_station.upper().strip()
        t = to_station.upper().strip()
        if not f or not t or f == t:
            return []

        # Known route corridors with station sequences
        CORRIDORS = [
            # Mumbai - Pune corridor
            ["CSMT", "DR", "TNA", "KYN", "LNL", "PUNE"],
            # Mumbai - Solapur corridor
            ["CSMT", "DR", "TNA", "KYN", "LNL", "PUNE", "DD", "KWV", "SUR"],
            # Solapur - Pune corridor
            ["SUR", "KWV", "DD", "PUNE"],
            # Solapur - Mumbai corridor
            ["SUR", "KWV", "DD", "PUNE", "LNL", "KYN", "TNA", "DR", "CSMT"],
            # Pune - Mumbai corridor
            ["PUNE", "LNL", "KYN", "TNA", "DR", "CSMT"],
            # Mumbai - Delhi corridor
            ["MMCT", "BVI", "VAPI", "ST", "BH", "BRC", "RTM", "KOTA", "MTJ", "NZM", "NDLS"],
            ["NDLS", "NZM", "MTJ", "KOTA", "RTM", "BRC", "BH", "ST", "VAPI", "BVI", "MMCT"],
            # Delhi - Varanasi corridor
            ["NDLS", "GZB", "ALJN", "TDL", "CNB", "FTP", "PRYJ", "MZP", "DDU", "BSB"],
            ["BSB", "DDU", "MZP", "PRYJ", "FTP", "CNB", "TDL", "ALJN", "GZB", "NDLS"],
            # Mumbai - Howrah corridor
            ["CSMT", "DR", "KYN", "IGP", "NK", "MMR", "JL", "BSL", "MKU", "SEG", "AK", "BD", "DMN", "WR", "NGP", "G", "DGG", "RJN", "DURG", "R", "BYT", "BSP", "CPH", "RIG", "JSG", "ROU", "CKP", "TATA", "GTS", "JGM", "KGP", "SRC", "HWH", "SHM"],
            ["LTT", "TNA", "KYN", "IGP", "NK", "MMR", "BSL", "AK", "BD", "WR", "NGP", "G", "DURG", "R", "BSP", "JSG", "ROU", "CKP", "TATA", "KGP", "SHM", "HWH"],
            # Mumbai - Ahmedabad corridor
            ["MMCT", "BVI", "VAPI", "BL", "ST", "BH", "BRC", "ANND", "ND", "MAN", "ADI", "GNC"],
            ["GNC", "ADI", "MAN", "ND", "ANND", "BRC", "BH", "ST", "BL", "VAPI", "BVI", "MMCT"],
            # Mumbai - Madgaon corridor
            ["CSMT", "DR", "TNA", "PNVL", "ROHA", "MNI", "KHED", "CHI", "SGR", "RN", "VBW", "KKW", "SNDD", "KUDL", "SWV", "THVM", "KRMI", "MAO"],
            ["MAO", "KRMI", "THVM", "SWV", "KUDL", "SNDD", "KKW", "VBW", "RN", "SGR", "CHI", "KHED", "MNI", "ROHA", "PNVL", "TNA", "DR", "CSMT"],
            # Bangalore - Delhi corridor
            ["SBC", "YPR", "HUP", "DMM", "ATP", "GTL", "RC", "YG", "WADI", "KLBG", "SUR", "DD", "MMR", "BSL", "KNW", "ET", "BPL", "BINA", "VGLJ", "GWL", "MRA", "DHO", "AGC", "MTJ", "FDB", "NZM", "NDLS"],
            ["NDLS", "NZM", "FDB", "MTJ", "AGC", "DHO", "MRA", "GWL", "VGLJ", "BINA", "BPL", "ET", "KNW", "BSL", "MMR", "DD", "SUR", "KLBG", "WADI", "YG", "RC", "GTL", "ATP", "DMM", "HUP", "YPR", "SBC"],
        ]

        def stations_in_order(c_list: List[str], s1: str, s2: str) -> bool:
            try:
                i1 = c_list.index(s1)
                i2 = c_list.index(s2)
                return i1 < i2
            except ValueError:
                return False

        matching_trains = []
        now_dt = datetime.now(IST)

        for train_num, p in cls.TRAIN_PROFILES.items():
            is_match = False
            origin = p.get("origin", "")
            dest = p.get("destination", "")

            # Direct match
            if origin == f and dest == t:
                is_match = True
            # Station corridor match
            elif (origin == f or dest == t or any(f in c and t in c for c in CORRIDORS)):
                for corridor in CORRIDORS:
                    if stations_in_order(corridor, f, t):
                        # Verify train moves in matching direction
                        if origin in corridor and dest in corridor:
                            if stations_in_order(corridor, origin, dest):
                                is_match = True
                                break
                        elif origin == f or dest == t:
                            is_match = True
                            break

            if is_match:
                status_info = cls.check_operational_status(train_num, now_dt)
                name = p.get("name", "")
                train_type = "Express"
                if "Vande Bharat" in name:
                    train_type = "Vande Bharat"
                elif "Rajdhani" in name:
                    train_type = "Rajdhani"
                elif "Shatabdi" in name:
                    train_type = "Shatabdi"
                elif "Duronto" in name:
                    train_type = "Duronto"
                elif "Superfast" in name or "Mail" in name:
                    train_type = "Superfast"

                matching_trains.append({
                    "train_number": p["number"],
                    "train_name": p["name"],
                    "train_type": train_type,
                    "from_station": f,
                    "to_station": t,
                    "origin": p["origin"],
                    "origin_name": p["origin_name"],
                    "destination": p["destination"],
                    "destination_name": p["destination_name"],
                    "dep_time": p.get("dep_time", "00:00"),
                    "arr_time": p.get("arr_time", "00:00"),
                    "days_of_run": p.get("days_of_run", []),
                    "mps_speed": p.get("mps_speed", 110),
                    "pairing_train": p.get("pairing_train"),
                    "service_state": status_info.get("service_state", "RUNNING"),
                    "running_status": status_info.get("running_status", ""),
                    "runs_today": status_info.get("runs_today", True),
                })

        # Sort by departure time
        matching_trains.sort(key=lambda x: x.get("dep_time", "00:00"))
        return matching_trains
