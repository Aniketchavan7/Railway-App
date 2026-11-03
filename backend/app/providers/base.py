from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.schemas.details import CoachComposition, FareEnquiryResult, PlatformInfo
from app.schemas.pnr import PNRStatus
from app.schemas.station import Station, StationLiveBoard
from app.schemas.status import RailwayStatus


class RailwayProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique identifier of the provider."""
        pass

    @property
    @abstractmethod
    def supported_capabilities(self) -> List[str]:
        """List of capabilities supported by this provider."""
        pass

    @abstractmethod
    async def get_live_status(self, train_number: str) -> Optional[RailwayStatus]:
        pass

    @abstractmethod
    async def get_schedule(self, train_number: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_route(self, train_number: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def search_trains(self, query: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def search_stations(self, query: str) -> List[Station]:
        pass

    async def get_station(self, code: str) -> Optional[Station]:
        return None

    @abstractmethod
    async def get_station_board(self, station_code: str, hours: int = 4) -> Optional[StationLiveBoard]:
        pass

    @abstractmethod
    async def get_coach_composition(self, train_number: str) -> Optional[CoachComposition]:
        pass

    @abstractmethod
    async def get_platform_information(self, train_number: str) -> List[PlatformInfo]:
        pass

    @abstractmethod
    async def get_pnr_status(self, pnr: str) -> Optional[PNRStatus]:
        pass

    @abstractmethod
    async def get_fare(
        self, train_number: str, origin: str, dest: str, quota: str = "GN"
    ) -> Optional[FareEnquiryResult]:
        pass

    @abstractmethod
    async def get_health(self) -> Dict[str, Any]:
        pass
