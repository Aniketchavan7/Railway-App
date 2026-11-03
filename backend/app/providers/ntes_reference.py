import logging
from typing import Any, Dict, List, Optional
from app.providers.base import RailwayProvider
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationLiveBoard
from app.schemas.status import RailwayStatus

logger = logging.getLogger("railpulse.providers.ntes")


class NTESReferenceProvider(RailwayProvider):
    """
    NTES Reference Provider.
    Per architectural review: NTES (National Train Enquiry System) is an official CRIS
    passenger enquiry service and does not offer an authorized open public developer REST API.
    This adapter acts as a compliance placeholder and manual verification reference stub.
    Direct web scraping or session bypass is strictly disabled.
    """

    @property
    def provider_name(self) -> str:
        return "ntes_reference"

    @property
    def supported_capabilities(self) -> List[str]:
        # Ready for authorized B2B CRIS/IRCTC integration
        return ["HEALTH"]

    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        logger.info("NTES live status query: Authorized CRIS API key required. Skipping.")
        return None

    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        return None

    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        return None

    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        return []

    async def search_stations(self, query: str) -> List[Station]:
        return []

    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        return None

    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        return None

    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        return []

    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        return None

    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> Optional[FareEnquiryResult]:
        return None

    async def get_health(self) -> Dict[str, Any]:
        return {
            "status": "REFERENCE_ONLY",
            "provider": self.provider_name,
            "message": "CRIS NTES is configured as an official reference stub. Authorized enterprise access required for automated queries.",
        }
