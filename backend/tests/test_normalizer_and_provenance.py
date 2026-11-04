import pytest
from app.providers.simulator import OfflineSimulatorProvider
from app.schemas.status import LocationType, ConfidenceLevel


@pytest.mark.asyncio
async def test_provenance_and_zero_fake_gps():
    sim = OfflineSimulatorProvider()
    status = await sim.get_live_status("12101")

    assert status is not None
    assert status.is_simulated is True
    assert status.location_type == LocationType.SIMULATED
    assert status.confidence == ConfidenceLevel.LOW
    assert "Jnaneswari" in status.train_name
    assert status.delay_minutes >= 0
    assert len(status.halts) > 0
