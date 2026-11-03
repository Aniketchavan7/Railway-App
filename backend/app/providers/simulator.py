from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.config import settings
from app.providers.base import RailwayProvider
from app.schemas.details import CoachComposition, CoachPosition, CoachType, FareClassBreakdown, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PassengerStatus, PNRStatus
from app.schemas.station import Station, StationBoardItem, StationLiveBoard
from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt

# High-fidelity reference data for key Indian trains
REFERENCE_TRAINS = {
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
}

REFERENCE_STATIONS = [
    {"code": "CSMT", "name": "Chhatrapati Shivaji Maharaj Terminus", "state": "Maharashtra", "zone": "CR", "lat": 18.9402, "lng": 72.8358},
    {"code": "PUNE", "name": "Pune Junction", "state": "Maharashtra", "zone": "CR", "lat": 18.5289, "lng": 73.8744},
    {"code": "NDLS", "name": "New Delhi", "state": "Delhi", "zone": "NR", "lat": 28.6415, "lng": 77.2195},
    {"code": "HWH", "name": "Howrah Junction", "state": "West Bengal", "zone": "ER", "lat": 22.5840, "lng": 88.3426},
    {"code": "KYN", "name": "Kalyan Junction", "state": "Maharashtra", "zone": "CR", "lat": 19.2364, "lng": 73.1302},
    {"code": "NGP", "name": "Nagpur Junction", "state": "Maharashtra", "zone": "CR", "lat": 21.1524, "lng": 79.0888},
    {"code": "BSL", "name": "Bhusaval Junction", "state": "Maharashtra", "zone": "CR", "lat": 21.0455, "lng": 75.7906},
    {"code": "IGP", "name": "Igatpuri", "state": "Maharashtra", "zone": "CR", "lat": 19.6967, "lng": 73.5606},
]


class OfflineSimulatorProvider(RailwayProvider):
    """
    Isolated Demo Simulator Provider.
    Adheres strictly to the architectural requirements:
    1. is_simulated is always True.
    2. location_type is always SIMULATED.
    3. confidence is LOW.
    4. Never claims live satellite GPS telemetry.
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

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        train = REFERENCE_TRAINS.get(train_number, REFERENCE_TRAINS["12101"])
        now = datetime.now(timezone.utc)
        halts_data = train["halts"]

        # Simulate train being mid-journey at halt 2 (Igatpuri for 12101)
        curr_idx = min(2, len(halts_data) - 1)
        curr_halt = halts_data[curr_idx]
        prev_halt = halts_data[curr_idx - 1] if curr_idx > 0 else curr_halt
        next_halt = halts_data[curr_idx + 1] if curr_idx < len(halts_data) - 1 else curr_halt

        halts: List[StationHalt] = []
        for idx, h in enumerate(halts_data):
            arrived = idx <= curr_idx
            departed = idx < curr_idx
            delay = 15 if idx >= curr_idx else 0
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
                )
            )

        return RailwayStatus(
            train_number=train["number"],
            train_name=train["name"],
            journey_date=now.strftime("%Y-%m-%d"),
            running_status=f"Departed {curr_halt['name']} (Simulated Demo)",
            delay_minutes=15,
            current_station=f"{curr_halt['name']} ({curr_halt['code']})",
            previous_station=f"{prev_halt['name']} ({prev_halt['code']})",
            next_station=f"{next_halt['name']} ({next_halt['code']})",
            latitude=curr_halt["lat"],
            longitude=curr_halt["lng"],
            speed_kmph=75.0,
            source_provider=self.provider_name,
            observed_at=now,
            fetched_at=now,
            age_seconds=0,
            freshness=FreshnessState.UNKNOWN,
            confidence=ConfidenceLevel.LOW,
            location_type=LocationType.SIMULATED,
            is_simulated=True,
            halts=halts,
        )

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        train = REFERENCE_TRAINS.get(train_number, REFERENCE_TRAINS["12101"])
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
        train = REFERENCE_TRAINS.get(train_number, REFERENCE_TRAINS["12101"])
        coordinates = [[h["lng"], h["lat"]] for h in train["halts"]]
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
        q = query.lower()
        results = []
        for t in REFERENCE_TRAINS.values():
            if q in t["number"] or q in t["name"].lower():
                results.append({
                    "train_number": t["number"],
                    "train_name": t["name"],
                    "origin": t["origin"],
                    "destination": t["destination"],
                    "is_simulated": True,
                })
        return results

    async def search_stations(self, query: str) -> List[Station]:
        q = query.lower()
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

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        trains = [
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
            StationBoardItem(
                train_number="12951",
                train_name="Mumbai Tejas Rajdhani Express",
                origin="MMCT",
                destination="NDLS",
                scheduled_arrival="17:00",
                expected_arrival="17:00",
                scheduled_departure="17:00",
                expected_departure="17:00",
                delay_arrival_minutes=0,
                delay_departure_minutes=0,
                platform="1",
                status="AT_STATION",
            ),
        ]
        return StationLiveBoard(
            station_code=station_code.upper(),
            station_name=station_code.upper(),
            window_hours=hours,
            updated_at=datetime.now(timezone.utc),
            trains=trains,
            source_provider=self.provider_name,
            is_simulated=True,
        )

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        train = REFERENCE_TRAINS.get(train_number, REFERENCE_TRAINS["12101"])
        layout = [
            ("LOCO", CoachType.LOCO),
            ("EOG", CoachType.SLR),
            ("GS", CoachType.GEN),
            ("S1", CoachType.SL),
            ("S2", CoachType.SL),
            ("S3", CoachType.SL),
            ("S4", CoachType.SL),
            ("S5", CoachType.SL),
            ("S6", CoachType.SL),
            ("PC", CoachType.PANTRY),
            ("B1", CoachType.AC3),
            ("B2", CoachType.AC3),
            ("B3", CoachType.AC3),
            ("B4", CoachType.AC3),
            ("B5", CoachType.AC3),
            ("B6", CoachType.AC3),
            ("A1", CoachType.AC2),
            ("A2", CoachType.AC2),
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
        train = REFERENCE_TRAINS.get(train_number, REFERENCE_TRAINS["12101"])
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
        return PNRStatus(
            pnr=pnr,
            train_number="12101",
            train_name="Jnaneswari Super Deluxe Express",
            journey_date="2026-11-10",
            from_station="LTT",
            to_station="HWH",
            boarding_station="LTT",
            reserved_up_to="HWH",
            reservation_class="3A",
            quota="GN",
            chart_status="CHART_NOT_PREPARED",
            passengers=[
                PassengerStatus(
                    passenger_number=1,
                    booking_status="CNF",
                    current_status="CNF",
                    coach="B2",
                    berth_number=45,
                    berth_type="Side Lower",
                ),
                PassengerStatus(
                    passenger_number=2,
                    booking_status="CNF",
                    current_status="CNF",
                    coach="B2",
                    berth_number=46,
                    berth_type="Side Upper",
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
