from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.config import settings
from app.providers.base import RailwayProvider
from app.schemas.details import CoachComposition, CoachPosition, CoachType, FareClassBreakdown, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PassengerStatus, PNRStatus
from app.schemas.station import Station, StationBoardItem, StationLiveBoard
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt
from app.services.train_schedule_service import TrainOperationsMetadata, IST

DEMO_PNR = "1234567890"

# High-fidelity reference data for key Indian trains
REFERENCE_TRAINS: Dict[str, Dict[str, Any]] = {
    # 22225 Mumbai CSMT - Solapur Vande Bharat Express
    "22225": {
        "number": "22225",
        "name": "Solapur Vande Bharat Express",
        "origin": "CSMT",
        "destination": "SUR",
        "halts": [
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": None, "sch_dep": "16:05", "dist": 0, "lat": 18.9402, "lng": 72.8358, "platform": "8"},
            {"code": "DR", "name": "Dadar Central", "sch_arr": "16:15", "sch_dep": "16:17", "dist": 9, "lat": 19.0178, "lng": 72.8478, "platform": "6"},
            {"code": "TNA", "name": "Thane", "sch_arr": "16:33", "sch_dep": "16:35", "dist": 34, "lat": 19.1860, "lng": 72.9757, "platform": "5"},
            {"code": "KYN", "name": "Kalyan Jn", "sch_arr": "16:51", "sch_dep": "16:53", "dist": 54, "lat": 19.2364, "lng": 73.1302, "platform": "5"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "19:10", "sch_dep": "19:15", "dist": 192, "lat": 18.5289, "lng": 73.8744, "platform": "2"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "21:28", "sch_dep": "21:30", "dist": 377, "lat": 18.0858, "lng": 75.4344, "platform": "3"},
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": "22:40", "sch_dep": None, "dist": 455, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
        ],
    },
    # 12115 Siddheshwar Superfast Express (Mumbai CSMT to Solapur)
    "12115": {
        "number": "12115",
        "name": "Siddheshwar Superfast Express",
        "origin": "CSMT",
        "destination": "SUR",
        "halts": [
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": None, "sch_dep": "22:40", "dist": 0, "lat": 18.9402, "lng": 72.8358, "platform": "16"},
            {"code": "DR", "name": "Dadar Central", "sch_arr": "22:52", "sch_dep": "22:55", "dist": 9, "lat": 19.0178, "lng": 72.8478, "platform": "5"},
            {"code": "TNA", "name": "Thane", "sch_arr": "23:22", "sch_dep": "23:25", "dist": 34, "lat": 19.1860, "lng": 72.9757, "platform": "5"},
            {"code": "KYN", "name": "Kalyan Jn", "sch_arr": "23:47", "sch_dep": "23:50", "dist": 54, "lat": 19.2364, "lng": 73.1302, "platform": "6"},
            {"code": "KJT", "name": "Karjat", "sch_arr": "00:38", "sch_dep": "00:40", "dist": 100, "lat": 18.9100, "lng": 73.3283, "platform": "1"},
            {"code": "LNL", "name": "Lonavala", "sch_arr": "01:28", "sch_dep": "01:30", "dist": 128, "lat": 18.7546, "lng": 73.4074, "platform": "2"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "02:40", "sch_dep": "02:45", "dist": 192, "lat": 18.5289, "lng": 73.8744, "platform": "3"},
            {"code": "DD", "name": "Daund Jn", "sch_arr": "04:00", "sch_dep": "04:05", "dist": 268, "lat": 18.4639, "lng": 74.5786, "platform": "5"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "05:38", "sch_dep": "05:40", "dist": 377, "lat": 18.0858, "lng": 75.4344, "platform": "3"},
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": "06:45", "sch_dep": None, "dist": 455, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
        ],
    },
    # 12116 Siddheshwar Superfast Express (Solapur to Mumbai CSMT)
    "12116": {
        "number": "12116",
        "name": "Siddheshwar Superfast Express",
        "origin": "SUR",
        "destination": "CSMT",
        "halts": [
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": None, "sch_dep": "22:30", "dist": 0, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "23:33", "sch_dep": "23:35", "dist": 79, "lat": 18.0858, "lng": 75.4344, "platform": "2"},
            {"code": "DD", "name": "Daund Jn", "sch_arr": "01:33", "sch_dep": "01:35", "dist": 187, "lat": 18.4639, "lng": 74.5786, "platform": "5"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "02:50", "sch_dep": "02:55", "dist": 263, "lat": 18.5289, "lng": 73.8744, "platform": "2"},
            {"code": "LNL", "name": "Lonavala", "sch_arr": "04:08", "sch_dep": "04:10", "dist": 327, "lat": 18.7546, "lng": 73.4074, "platform": "2"},
            {"code": "KYN", "name": "Kalyan Jn", "sch_arr": "05:37", "sch_dep": "05:40", "dist": 401, "lat": 19.2364, "lng": 73.1302, "platform": "6"},
            {"code": "TNA", "name": "Thane", "sch_arr": "05:58", "sch_dep": "06:00", "dist": 421, "lat": 19.1860, "lng": 72.9757, "platform": "7"},
            {"code": "DR", "name": "Dadar Central", "sch_arr": "06:22", "sch_dep": "06:25", "dist": 446, "lat": 19.0178, "lng": 72.8478, "platform": "7"},
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": "06:50", "sch_dep": None, "dist": 455, "lat": 18.9402, "lng": 72.8358, "platform": "18"},
        ],
    },
    # 22226 Solapur - Mumbai CSMT Vande Bharat Express
    "22226": {
        "number": "22226",
        "name": "Mumbai CSMT Vande Bharat Express",
        "origin": "SUR",
        "destination": "CSMT",
        "halts": [
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": None, "sch_dep": "06:05", "dist": 0, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "06:53", "sch_dep": "06:55", "dist": 79, "lat": 18.0858, "lng": 75.4344, "platform": "2"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "09:15", "sch_dep": "09:20", "dist": 263, "lat": 18.5289, "lng": 73.8744, "platform": "3"},
            {"code": "KYN", "name": "Kalyan Jn", "sch_arr": "11:33", "sch_dep": "11:35", "dist": 401, "lat": 19.2364, "lng": 73.1302, "platform": "6"},
            {"code": "TNA", "name": "Thane", "sch_arr": "11:53", "sch_dep": "11:55", "dist": 421, "lat": 19.1860, "lng": 72.9757, "platform": "7"},
            {"code": "DR", "name": "Dadar Central", "sch_arr": "12:12", "sch_dep": "12:14", "dist": 446, "lat": 19.0178, "lng": 72.8478, "platform": "7"},
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": "12:35", "sch_dep": None, "dist": 455, "lat": 18.9402, "lng": 72.8358, "platform": "9"},
        ],
    },
    # 12158 Hutatma Express (Solapur to Pune)
    "12158": {
        "number": "12158",
        "name": "Hutatma Express",
        "origin": "SUR",
        "destination": "PUNE",
        "halts": [
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": None, "sch_dep": "06:30", "dist": 0, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "07:17", "sch_dep": "07:20", "dist": 79, "lat": 18.0858, "lng": 75.4344, "platform": "2"},
            {"code": "DD", "name": "Daund Jn", "sch_arr": "09:03", "sch_dep": "09:05", "dist": 188, "lat": 18.4639, "lng": 74.5786, "platform": "5"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "10:30", "sch_dep": None, "dist": 264, "lat": 18.5289, "lng": 73.8744, "platform": "3"},
        ],
    },
    # 12157 Hutatma Express (Pune to Solapur)
    "12157": {
        "number": "12157",
        "name": "Hutatma Express",
        "origin": "PUNE",
        "destination": "SUR",
        "halts": [
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": None, "sch_dep": "17:55", "dist": 0, "lat": 18.5289, "lng": 73.8744, "platform": "3"},
            {"code": "DD", "name": "Daund Jn", "sch_arr": "19:08", "sch_dep": "19:10", "dist": 76, "lat": 18.4639, "lng": 74.5786, "platform": "5"},
            {"code": "KWV", "name": "Kurduvadi Jn", "sch_arr": "20:38", "sch_dep": "20:40", "dist": 185, "lat": 18.0858, "lng": 75.4344, "platform": "3"},
            {"code": "SUR", "name": "Solapur Jn", "sch_arr": "21:40", "sch_dep": None, "dist": 264, "lat": 17.6599, "lng": 75.9064, "platform": "1"},
        ],
    },
    # 12101 Jnaneswari Super Deluxe Express (LTT to HWH)
    "12101": {
        "number": "12101",
        "name": "Jnaneswari Super Deluxe Express",
        "origin": "LTT",
        "destination": "HWH",
        "halts": [
            {"code": "LTT", "name": "Lokmanya Tilak Terminus", "sch_arr": None, "sch_dep": "20:35", "dist": 0, "lat": 19.0697, "lng": 72.8906, "platform": "1"},
            {"code": "KYN", "name": "Kalyan Jn", "sch_arr": "21:12", "sch_dep": "21:15", "dist": 35, "lat": 19.2364, "lng": 73.1302, "platform": "4"},
            {"code": "IGP", "name": "Igatpuri", "sch_arr": "22:45", "sch_dep": "22:50", "dist": 116, "lat": 19.6967, "lng": 73.5606, "platform": "2"},
            {"code": "NK", "name": "Nashik Road", "sch_arr": "23:35", "sch_dep": "23:40", "dist": 167, "lat": 19.9572, "lng": 73.8340, "platform": "2"},
            {"code": "BSL", "name": "Bhusaval Jn", "sch_arr": "03:00", "sch_dep": "03:05", "dist": 424, "lat": 21.0455, "lng": 75.7906, "platform": "3"},
            {"code": "AK", "name": "Akola Jn", "sch_arr": "05:00", "sch_dep": "05:05", "dist": 563, "lat": 20.7061, "lng": 77.0097, "platform": "2"},
            {"code": "BD", "name": "Badnera Jn", "sch_arr": "06:25", "sch_dep": "06:30", "dist": 642, "lat": 20.8667, "lng": 77.7500, "platform": "1"},
            {"code": "NGP", "name": "Nagpur Jn", "sch_arr": "09:35", "sch_dep": "09:40", "dist": 816, "lat": 21.1524, "lng": 79.0888, "platform": "3"},
            {"code": "G", "name": "Gondia Jn", "sch_arr": "11:23", "sch_dep": "11:25", "dist": 946, "lat": 21.4598, "lng": 80.1961, "platform": "4"},
            {"code": "DURG", "name": "Durg Jn", "sch_arr": "13:20", "sch_dep": "13:25", "dist": 1081, "lat": 21.1904, "lng": 81.2849, "platform": "1"},
            {"code": "R", "name": "Raipur Jn", "sch_arr": "14:05", "sch_dep": "14:10", "dist": 1118, "lat": 21.2514, "lng": 81.6296, "platform": "2"},
            {"code": "BSP", "name": "Bilaspur Jn", "sch_arr": "15:55", "sch_dep": "16:10", "dist": 1229, "lat": 22.0797, "lng": 82.1409, "platform": "1"},
            {"code": "ROU", "name": "Rourkela Jn", "sch_arr": "20:30", "sch_dep": "20:38", "dist": 1534, "lat": 22.2262, "lng": 84.8546, "platform": "4"},
            {"code": "CKP", "name": "Chakradharpur", "sch_arr": "22:00", "sch_dep": "22:05", "dist": 1635, "lat": 22.7011, "lng": 85.6264, "platform": "2"},
            {"code": "TATA", "name": "Tatanagar Jn", "sch_arr": "23:05", "sch_dep": "23:12", "dist": 1697, "lat": 22.7667, "lng": 86.1989, "platform": "1"},
            {"code": "KGP", "name": "Kharagpur Jn", "sch_arr": "01:25", "sch_dep": "01:30", "dist": 1831, "lat": 22.3385, "lng": 87.3235, "platform": "6"},
            {"code": "HWH", "name": "Howrah Jn", "sch_arr": "03:40", "sch_dep": None, "dist": 1946, "lat": 22.5840, "lng": 88.3426, "platform": "18"},
        ],
    },
    # 12951 Mumbai Tejas Rajdhani Express
    "12951": {
        "number": "12951",
        "name": "Mumbai Tejas Rajdhani Express",
        "origin": "MMCT",
        "destination": "NDLS",
        "halts": [
            {"code": "MMCT", "name": "Mumbai Central", "sch_arr": None, "sch_dep": "17:00", "dist": 0, "lat": 18.9696, "lng": 72.8193, "platform": "1"},
            {"code": "BVI", "name": "Borivali", "sch_arr": "17:22", "sch_dep": "17:24", "dist": 30, "lat": 19.2288, "lng": 72.8576, "platform": "6"},
            {"code": "ST", "name": "Surat", "sch_arr": "19:43", "sch_dep": "19:48", "dist": 263, "lat": 21.2049, "lng": 72.8411, "platform": "1"},
            {"code": "BRC", "name": "Vadodara Jn", "sch_arr": "21:06", "sch_dep": "21:16", "dist": 393, "lat": 22.3107, "lng": 73.1812, "platform": "2"},
            {"code": "RTM", "name": "Ratlam Jn", "sch_arr": "00:25", "sch_dep": "00:28", "dist": 653, "lat": 23.3441, "lng": 75.0441, "platform": "5"},
            {"code": "KOTA", "name": "Kota Jn", "sch_arr": "03:15", "sch_dep": "03:20", "dist": 920, "lat": 25.2185, "lng": 75.8648, "platform": "1"},
            {"code": "NDLS", "name": "New Delhi", "sch_arr": "08:32", "sch_dep": None, "dist": 1386, "lat": 28.6415, "lng": 77.2195, "platform": "2"},
        ],
    },
    # 22436 Vande Bharat Express (NDLS to BSB)
    "22436": {
        "number": "22436",
        "name": "Vande Bharat Express",
        "origin": "NDLS",
        "destination": "BSB",
        "halts": [
            {"code": "NDLS", "name": "New Delhi", "sch_arr": None, "sch_dep": "06:00", "dist": 0, "lat": 28.6415, "lng": 77.2195, "platform": "16"},
            {"code": "CNB", "name": "Kanpur Central", "sch_arr": "10:08", "sch_dep": "10:10", "dist": 440, "lat": 26.4539, "lng": 80.3513, "platform": "5"},
            {"code": "PRYJ", "name": "Prayagraj Jn", "sch_arr": "12:08", "sch_dep": "12:10", "dist": 634, "lat": 25.4484, "lng": 81.8340, "platform": "6"},
            {"code": "BSB", "name": "Varanasi Jn", "sch_arr": "14:00", "sch_dep": None, "dist": 759, "lat": 25.3284, "lng": 82.9868, "platform": "1"},
        ],
    },
    # 12123 Deccan Queen (CSMT to PUNE)
    "12123": {
        "number": "12123",
        "name": "Deccan Queen Superfast Express",
        "origin": "CSMT",
        "destination": "PUNE",
        "halts": [
            {"code": "CSMT", "name": "Mumbai CSMT", "sch_arr": None, "sch_dep": "17:10", "dist": 0, "lat": 18.9402, "lng": 72.8358, "platform": "8"},
            {"code": "KJT", "name": "Karjat", "sch_arr": "18:33", "sch_dep": "18:35", "dist": 100, "lat": 18.9100, "lng": 73.3283, "platform": "1"},
            {"code": "LNL", "name": "Lonavala", "sch_arr": "19:18", "sch_dep": "19:20", "dist": 128, "lat": 18.7546, "lng": 73.4074, "platform": "2"},
            {"code": "SVJR", "name": "Shivajinagar", "sch_arr": "20:09", "sch_dep": "20:10", "dist": 190, "lat": 18.5326, "lng": 73.8524, "platform": "1"},
            {"code": "PUNE", "name": "Pune Jn", "sch_arr": "20:25", "sch_dep": None, "dist": 192, "lat": 18.5289, "lng": 73.8744, "platform": "5"},
        ],
    },
}

REFERENCE_STATIONS = [
    {"code": "CSMT", "name": "Chhatrapati Shivaji Maharaj Terminus", "state": "Maharashtra", "zone": "CR", "lat": 18.9402, "lng": 72.8358},
    {"code": "DR", "name": "Dadar Central", "state": "Maharashtra", "zone": "CR", "lat": 19.0178, "lng": 72.8478},
    {"code": "TNA", "name": "Thane", "state": "Maharashtra", "zone": "CR", "lat": 19.1860, "lng": 72.9757},
    {"code": "KYN", "name": "Kalyan Junction", "state": "Maharashtra", "zone": "CR", "lat": 19.2364, "lng": 73.1302},
    {"code": "PUNE", "name": "Pune Junction", "state": "Maharashtra", "zone": "CR", "lat": 18.5289, "lng": 73.8744},
    {"code": "DD", "name": "Daund Junction", "state": "Maharashtra", "zone": "CR", "lat": 18.4639, "lng": 74.5786},
    {"code": "KWV", "name": "Kurduvadi Junction", "state": "Maharashtra", "zone": "CR", "lat": 18.0858, "lng": 75.4344},
    {"code": "SUR", "name": "Solapur Junction", "state": "Maharashtra", "zone": "CR", "lat": 17.6599, "lng": 75.9064},
    {"code": "NDLS", "name": "New Delhi", "state": "Delhi", "zone": "NR", "lat": 28.6415, "lng": 77.2195},
    {"code": "HWH", "name": "Howrah Junction", "state": "West Bengal", "zone": "ER", "lat": 22.5840, "lng": 88.3426},
    {"code": "NGP", "name": "Nagpur Junction", "state": "Maharashtra", "zone": "CR", "lat": 21.1524, "lng": 79.0888},
    {"code": "BSL", "name": "Bhusaval Junction", "state": "Maharashtra", "zone": "CR", "lat": 21.0455, "lng": 75.7906},
    {"code": "IGP", "name": "Igatpuri", "state": "Maharashtra", "zone": "CR", "lat": 19.6967, "lng": 73.5606},
    {"code": "LNL", "name": "Lonavala", "state": "Maharashtra", "zone": "CR", "lat": 18.7546, "lng": 73.4074},
    {"code": "CNB", "name": "Kanpur Central", "state": "Uttar Pradesh", "zone": "NCR", "lat": 26.4539, "lng": 80.3513},
    {"code": "PRYJ", "name": "Prayagraj Junction", "state": "Uttar Pradesh", "zone": "NCR", "lat": 25.4484, "lng": 81.8340},
    {"code": "BSB", "name": "Varanasi Junction", "state": "Uttar Pradesh", "zone": "NR", "lat": 25.3284, "lng": 82.9868},
    {"code": "MMCT", "name": "Mumbai Central", "state": "Maharashtra", "zone": "WR", "lat": 18.9696, "lng": 72.8193},
    {"code": "ST", "name": "Surat", "state": "Gujarat", "zone": "WR", "lat": 21.2049, "lng": 72.8411},
    {"code": "BRC", "name": "Vadodara Junction", "state": "Gujarat", "zone": "WR", "lat": 22.3107, "lng": 73.1812},
    {"code": "KOTA", "name": "Kota Junction", "state": "Rajasthan", "zone": "WCR", "lat": 25.2185, "lng": 75.8648},
    {"code": "GNC", "name": "Gandhinagar Capital", "state": "Gujarat", "zone": "WR", "lat": 23.2323, "lng": 72.6397},
    {"code": "ADI", "name": "Ahmedabad Junction", "state": "Gujarat", "zone": "WR", "lat": 23.0258, "lng": 72.6010},
    {"code": "SBC", "name": "KSR Bengaluru", "state": "Karnataka", "zone": "SWR", "lat": 12.9781, "lng": 77.5694},
    {"code": "MAS", "name": "MGR Chennai Central", "state": "Tamil Nadu", "zone": "SR", "lat": 13.0827, "lng": 80.2707},
    {"code": "MYS", "name": "Mysuru Junction", "state": "Karnataka", "zone": "SWR", "lat": 12.3160, "lng": 76.6496},
    {"code": "DADN", "name": "Dr. Ambedkar Nagar", "state": "Madhya Pradesh", "zone": "WR", "lat": 22.5539, "lng": 75.7607},
    {"code": "SVDK", "name": "SMVD Katra", "state": "Jammu & Kashmir", "zone": "NR", "lat": 32.9918, "lng": 74.9318},
    {"code": "NZM", "name": "Hazrat Nizamuddin", "state": "Delhi", "zone": "NR", "lat": 28.5888, "lng": 77.2534},
    {"code": "SHM", "name": "Shalimar", "state": "West Bengal", "zone": "SER", "lat": 22.5552, "lng": 88.3188},
    {"code": "MAO", "name": "Madgaon Junction", "state": "Goa", "zone": "KR", "lat": 15.2750, "lng": 73.9783},
]


class OfflineSimulatorProvider(RailwayProvider):
    """
    Isolated Demo Simulator Provider.
    Adheres strictly to the architectural requirements:
    1. is_simulated is always True.
    2. location_type is always SIMULATED.
    3. confidence is LOW.
    4. Never claims live satellite GPS telemetry.
    5. Dynamically supports any valid train number with authentic station coordinates.
    """

    @property
    def provider_name(self) -> str:
        return "offline_simulator"

    @property
    def supported_capabilities(self) -> List[str]:
        return [
            "LIVE_STATUS",
            "SCHEDULE",
            "ROUTE",
            "TRAIN_SEARCH",
            "STATION_SEARCH",
            "STATION_LIVE_BOARD",
            "COACH_COMPOSITION",
            "PLATFORM_INFO",
            "PNR_STATUS",
            "FARE_ENQUIRY",
            "HEALTH",
        ]

    def _resolve_train(self, train_number: str) -> Optional[Dict[str, Any]]:
        """Look up a known train. Returns None for any other number."""
        clean_num = str(train_number).strip()
        if clean_num in REFERENCE_TRAINS:
            return REFERENCE_TRAINS[clean_num]

        profile = TrainOperationsMetadata.get_profile(clean_num)
        if profile:
            orig_code = profile.get("origin", "CSMT")
            dest_code = profile.get("destination", "PUNE")
            orig_name = profile.get("origin_name", orig_code)
            dest_name = profile.get("destination_name", dest_code)
            dep = profile.get("dep_time", "06:00")
            arr = profile.get("arr_time", "12:00")

            orig_stn = next((s for s in REFERENCE_STATIONS if s["code"] == orig_code), None)
            dest_stn = next((s for s in REFERENCE_STATIONS if s["code"] == dest_code), None)

            orig_lat = orig_stn["lat"] if orig_stn else None
            orig_lng = orig_stn["lng"] if orig_stn else None
            dest_lat = dest_stn["lat"] if dest_stn else None
            dest_lng = dest_stn["lng"] if dest_stn else None

            halts = [
                {"code": orig_code, "name": orig_name, "sch_arr": None, "sch_dep": dep, "dist": 0, "lat": orig_lat, "lng": orig_lng, "platform": "1"},
                {"code": dest_code, "name": dest_name, "sch_arr": arr, "sch_dep": None, "dist": 0, "lat": dest_lat, "lng": dest_lng, "platform": "1"},
            ]
            return {
                "number": clean_num,
                "name": profile.get("name", f"Express {clean_num}"),
                "origin": orig_code,
                "destination": dest_code,
                "halts": halts,
            }

        # An unknown number is unknown. Inventing a train for it would show a passenger
        # a journey that does not exist.
        return None

    async def get_live_status(
        self, train_number: str, journey_date: Optional[str] = None
    ) -> Optional[RailwayStatus]:
        train = self._resolve_train(train_number)
        if not train:
            return None
        now = datetime.now(timezone.utc)
        now_ist = datetime.now(IST)
        halts_data = train["halts"]

        # Evaluate authentic operational schedule, running days & temporal time window
        op_check = TrainOperationsMetadata.check_operational_status(train_number, now)
        service_state = op_check.get("service_state", "RUNNING")
        days_of_run = op_check.get("days_of_run", ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])
        service_notice = op_check.get("service_notice")
        pairing_train = op_check.get("pairing_train")

        if service_state == "NOT_RUNNING_TODAY":
            first_halt = halts_data[0]
            halts = [
                StationHalt(
                    station_code=h["code"],
                    station_name=h["name"],
                    arrival_time=h.get("sch_arr"),
                    departure_time=h.get("sch_dep"),
                    distance_km=float(h.get("dist", 0.0)),
                    day_count=1,
                    platform=h.get("platform", "1"),
                    delay_minutes=0,
                    has_arrived=False,
                    has_departed=False,
                    latitude=h.get("lat"),
                    longitude=h.get("lng"),
                )
                for h in halts_data
            ]
            return RailwayStatus(
                train_number=train["number"],
                train_name=train["name"],
                journey_date=now_ist.strftime("%Y-%m-%d"),
                running_status=op_check["running_status"],
                delay_minutes=0,
                current_station=f"{first_halt['name']} (Depot / Non-Operating Day)",
                previous_station=None,
                next_station=None,
                latitude=first_halt["lat"],
                longitude=first_halt["lng"],
                speed_kmph=0.0,
                source_provider=self.provider_name,
                observed_at=now,
                fetched_at=now,
                age_seconds=0,
                freshness=FreshnessState.LIVE,
                confidence=ConfidenceLevel.LOW,
                location_type=LocationType.SIMULATED,
                is_simulated=True,
                halts=halts,
                runs_today=False,
                days_of_run=days_of_run,
                service_state="NOT_RUNNING_TODAY",
                service_notice=service_notice,
                pairing_train_number=pairing_train,
            )

        if service_state == "NOT_STARTED":
            first_halt = halts_data[0]
            next_h = halts_data[1] if len(halts_data) > 1 else first_halt
            halts = [
                StationHalt(
                    station_code=h["code"],
                    station_name=h["name"],
                    arrival_time=h.get("sch_arr"),
                    departure_time=h.get("sch_dep"),
                    distance_km=float(h.get("dist", 0.0)),
                    day_count=1,
                    platform=h.get("platform", "1"),
                    delay_minutes=0,
                    has_arrived=False,
                    has_departed=False,
                    latitude=h.get("lat"),
                    longitude=h.get("lng"),
                )
                for h in halts_data
            ]
            return RailwayStatus(
                train_number=train["number"],
                train_name=train["name"],
                journey_date=now_ist.strftime("%Y-%m-%d"),
                running_status=op_check["running_status"],
                delay_minutes=0,
                current_station=f"{first_halt['name']} (Origin Platform {first_halt.get('platform', '1')})",
                previous_station=None,
                next_station=f"{next_h['name']} ({next_h['code']})",
                latitude=first_halt["lat"],
                longitude=first_halt["lng"],
                speed_kmph=0.0,
                source_provider=self.provider_name,
                observed_at=now,
                fetched_at=now,
                age_seconds=0,
                freshness=FreshnessState.LIVE,
                confidence=ConfidenceLevel.LOW,
                location_type=LocationType.SIMULATED,
                is_simulated=True,
                halts=halts,
                runs_today=True,
                days_of_run=days_of_run,
                service_state="NOT_STARTED",
                service_notice=service_notice,
                pairing_train_number=pairing_train,
            )

        if service_state == "COMPLETED":
            last_halt = halts_data[-1]
            prev_h = halts_data[-2] if len(halts_data) > 1 else last_halt
            halts = [
                StationHalt(
                    station_code=h["code"],
                    station_name=h["name"],
                    arrival_time=h.get("sch_arr"),
                    departure_time=h.get("sch_dep"),
                    distance_km=float(h.get("dist", 0.0)),
                    day_count=1,
                    platform=h.get("platform", "1"),
                    delay_minutes=0,
                    has_arrived=True,
                    has_departed=True,
                    latitude=h.get("lat"),
                    longitude=h.get("lng"),
                )
                for h in halts_data
            ]
            return RailwayStatus(
                train_number=train["number"],
                train_name=train["name"],
                journey_date=now_ist.strftime("%Y-%m-%d"),
                running_status=op_check["running_status"],
                delay_minutes=0,
                current_station=f"{last_halt['name']} (Terminated on Platform {last_halt.get('platform', '1')})",
                previous_station=f"{prev_h['name']} ({prev_h['code']})",
                next_station=None,
                latitude=last_halt["lat"],
                longitude=last_halt["lng"],
                speed_kmph=0.0,
                source_provider=self.provider_name,
                observed_at=now,
                fetched_at=now,
                age_seconds=0,
                freshness=FreshnessState.LIVE,
                confidence=ConfidenceLevel.LOW,
                location_type=LocationType.SIMULATED,
                is_simulated=True,
                halts=halts,
                runs_today=True,
                days_of_run=days_of_run,
                service_state="COMPLETED",
                service_notice=service_notice,
                pairing_train_number=pairing_train,
            )

        # Active mid-journey in transit
        curr_idx = min(1, len(halts_data) - 1)
        curr_halt = halts_data[curr_idx]
        prev_halt = halts_data[curr_idx - 1] if curr_idx > 0 else curr_halt
        next_halt = halts_data[curr_idx + 1] if curr_idx < len(halts_data) - 1 else curr_halt

        train_delay = 15 if str(train.get("number")) == "12101" else 5
        halts = []
        for idx, h in enumerate(halts_data):
            arrived = idx <= curr_idx
            departed = idx < curr_idx
            delay = 0 if idx == 0 else train_delay
            halts.append(
                StationHalt(
                    station_code=h["code"],
                    station_name=h["name"],
                    arrival_time=h.get("sch_arr"),
                    departure_time=h.get("sch_dep"),
                    distance_km=float(h.get("dist", 0.0)),
                    day_count=1,
                    platform=h.get("platform", "1"),
                    delay_minutes=delay,
                    has_arrived=arrived,
                    has_departed=departed,
                    latitude=h.get("lat"),
                    longitude=h.get("lng"),
                )
            )

        speed = 110.0 if "vande" in train["name"].lower() else 75.0

        return RailwayStatus(
            train_number=train["number"],
            train_name=train["name"],
            journey_date=now_ist.strftime("%Y-%m-%d"),
            running_status=f"Departed {curr_halt['name']} (Simulated Demo)",
            delay_minutes=train_delay,
            current_station=f"{curr_halt['name']} ({curr_halt['code']})",
            previous_station=f"{prev_halt['name']} ({prev_halt['code']})",
            next_station=f"{next_halt['name']} ({next_halt['code']})",
            latitude=curr_halt["lat"],
            longitude=curr_halt["lng"],
            speed_kmph=speed,
            source_provider=self.provider_name,
            observed_at=now,
            fetched_at=now,
            age_seconds=0,
            freshness=FreshnessState.UNKNOWN,
            confidence=ConfidenceLevel.LOW,
            location_type=LocationType.SIMULATED,
            is_simulated=True,
            halts=halts,
            runs_today=True,
            days_of_run=days_of_run,
            service_state="RUNNING",
            service_notice=service_notice,
            pairing_train_number=pairing_train,
        )

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        train = self._resolve_train(train_number)
        if not train:
            return None
        return {
            "train_number": train["number"],
            "train_name": train["name"],
            "origin": train["origin"],
            "destination": train["destination"],
            "days_of_run": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
            "halts": train["halts"],
            "is_simulated": True,
            "source_provider": self.provider_name,
        }

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        train = self._resolve_train(train_number)
        if not train:
            return None
        coordinates = [[h["lng"], h["lat"]] for h in train["halts"] if h.get("lat") is not None]
        return {
            "train_number": train["number"],
            "train_name": train["name"],
            "type": "LineString",
            "coordinates": coordinates,
            "halts": train["halts"],
            "is_simulated": True,
            "source_provider": self.provider_name,
        }

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        q = query.lower().strip()
        results = []
        for t in REFERENCE_TRAINS.values():
            if (
                q in t["number"].lower()
                or q in t["name"].lower()
                or q in t["origin"].lower()
                or q in t["destination"].lower()
            ):
                results.append({
                    "train_number": t["number"],
                    "train_name": t["name"],
                    "origin": t["origin"],
                    "destination": t["destination"],
                    "is_simulated": True,
                })

        return results

    async def search_stations(self, query: str) -> List[Station]:
        q = query.lower().strip()
        results = []
        for s in REFERENCE_STATIONS:
            if q in s["code"].lower() or q in s["name"].lower():
                results.append(
                    Station(
                        station_code=s["code"],
                        station_name=s["name"],
                        state=s["state"],
                        zone=s["zone"],
                        latitude=s["lat"],
                        longitude=s["lng"],
                    )
                )
        return results

    async def get_station(self, code: str) -> Optional[Station]:
        clean = code.upper().strip()
        for s in REFERENCE_STATIONS:
            if s["code"].upper() == clean:
                return Station(
                    station_code=s["code"],
                    station_name=s["name"],
                    state=s["state"],
                    zone=s["zone"],
                    latitude=s["lat"],
                    longitude=s["lng"],
                )
        return None

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        code = station_code.upper().strip()
        trains = [
            StationBoardItem(
                train_number="22225",
                train_name="Solapur Vande Bharat Express",
                origin="CSMT",
                destination="SUR",
                scheduled_arrival="19:10",
                expected_arrival="19:10",
                scheduled_departure="19:15",
                expected_departure="19:15",
                delay_arrival_minutes=0,
                delay_departure_minutes=0,
                platform="2",
                status="UPCOMING",
            ),
            StationBoardItem(
                train_number="12158",
                train_name="Hutatma Express",
                origin="SUR",
                destination="PUNE",
                scheduled_arrival="10:30",
                expected_arrival="10:30",
                scheduled_departure="10:30",
                expected_departure="10:30",
                delay_arrival_minutes=0,
                delay_departure_minutes=0,
                platform="3",
                status="AT_STATION",
            ),
            StationBoardItem(
                train_number="12101",
                train_name="Jnaneswari Super Deluxe Express",
                origin="LTT",
                destination="HWH",
                scheduled_arrival="21:12",
                expected_arrival="21:27",
                scheduled_departure="21:15",
                expected_departure="21:30",
                delay_arrival_minutes=15,
                delay_departure_minutes=15,
                platform="4",
                status="UPCOMING",
            ),
        ]
        return StationLiveBoard(
            station_code=code,
            station_name=code,
            window_hours=hours,
            updated_at=datetime.now(timezone.utc),
            trains=trains,
            source_provider=self.provider_name,
            is_simulated=True,
        )

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        train = self._resolve_train(train_number)
        if not train:
            return None
        num = train["number"]
        name_lower = train["name"].lower()

        is_vb = "vande bharat" in name_lower or num in ("22225", "22226", "22436", "22435")
        is_intercity = "hutatma" in name_lower or "deccan" in name_lower or num in ("12157", "12158", "12123", "12124")
        is_rajdhani = "rajdhani" in name_lower or "tejas" in name_lower or num in ("12951", "12952")

        if is_vb:
            layout = [
                ("C1", CoachType.CC),
                ("C2", CoachType.CC),
                ("C3", CoachType.CC),
                ("C4", CoachType.CC),
                ("E1", CoachType.EC),
                ("C5", CoachType.CC),
                ("C6", CoachType.CC),
                ("C7", CoachType.CC),
            ]
        elif is_intercity:
            layout = [
                ("LOCO", CoachType.LOCO),
                ("SLR", CoachType.SLR),
                ("GS1", CoachType.GEN),
                ("D1", CoachType.GEN),
                ("D2", CoachType.GEN),
                ("D3", CoachType.GEN),
                ("C1", CoachType.CC),
                ("D4", CoachType.GEN),
                ("D5", CoachType.GEN),
                ("GS2", CoachType.GEN),
                ("SLR", CoachType.SLR),
            ]
        elif is_rajdhani:
            layout = [
                ("LOCO", CoachType.LOCO),
                ("EOG", CoachType.SLR),
                ("B1", CoachType.AC3),
                ("B2", CoachType.AC3),
                ("B3", CoachType.AC3),
                ("B4", CoachType.AC3),
                ("PC", CoachType.PANTRY),
                ("A1", CoachType.AC2),
                ("A2", CoachType.AC2),
                ("H1", CoachType.AC1),
                ("EOG", CoachType.SLR),
            ]
        else:
            layout = [
                ("LOCO", CoachType.LOCO),
                ("EOG", CoachType.SLR),
                ("GS", CoachType.GEN),
                ("S1", CoachType.SL),
                ("S2", CoachType.SL),
                ("S3", CoachType.SL),
                ("S4", CoachType.SL),
                ("PC", CoachType.PANTRY),
                ("B1", CoachType.AC3),
                ("B2", CoachType.AC3),
                ("A1", CoachType.AC2),
                ("H1", CoachType.AC1),
                ("GS", CoachType.GEN),
                ("SLR", CoachType.SLR),
            ]

        coaches = [
            CoachPosition(position_number=idx + 1, coach_code=code, coach_type=ctype)
            for idx, (code, ctype) in enumerate(layout)
        ]
        return CoachComposition(
            train_number=train["number"],
            train_name=train["name"],
            total_coaches=len(coaches),
            coaches=coaches,
            source_provider=self.provider_name,
            is_simulated=True,
        )

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        train = self._resolve_train(train_number)
        if not train:
            return []
        return [
            PlatformInfo(
                station_code=h["code"],
                station_name=h["name"],
                train_number=train["number"],
                platform_number=h.get("platform", "1"),
                confidence="HISTORICAL",
            )
            for h in train["halts"]
        ]

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        # One clearly fake demo number, so no real PNR can ever get a made-up booking.
        if pnr != DEMO_PNR:
            return None
        return PNRStatus(
            pnr=pnr,
            train_number="22225",
            train_name="Solapur Vande Bharat Express",
            journey_date="2026-11-10",
            from_station="CSMT",
            to_station="SUR",
            boarding_station="CSMT",
            reserved_up_to="SUR",
            reservation_class="CC",
            quota="GN",
            chart_status="CHART_NOT_PREPARED",
            passengers=[
                PassengerStatus(
                    passenger_number=1,
                    booking_status="CNF",
                    current_status="CNF",
                    coach="C2",
                    berth_number=32,
                    berth_type="Window",
                ),
                PassengerStatus(
                    passenger_number=2,
                    booking_status="CNF",
                    current_status="CNF",
                    coach="C2",
                    berth_number=33,
                    berth_type="Aisle",
                ),
            ],
            source_provider=self.provider_name,
            is_simulated=True,
            verification_tier="demo_record",
            privacy_notice="Simulated demo PNR. No personal passenger data is retrieved or stored.",
        )

    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> Optional[FareEnquiryResult]:
        # Handled deterministically by Railway Board Fare Engine
        return None

    async def get_health(self) -> Dict[str, Any]:
        return {
            "status": "SIMULATION_ACTIVE",
            "provider": self.provider_name,
            "is_simulated": True,
            "message": "Offline Simulator is active for reference testing and demo routes.",
        }
