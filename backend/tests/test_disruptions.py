import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.disruption_service import DisruptionService


def test_no_alerts_without_a_verified_source():
    summary = DisruptionService.get_disruption_summary()
    assert summary.total_active_alerts == 0
    assert summary.source_provider == "no_verified_source"
    assert DisruptionService.get_train_disruptions("12115") == []
    assert DisruptionService.get_corridor_mega_blocks("CR") == []


@pytest.mark.asyncio
async def test_disruption_endpoints_and_ai():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/v1/alerts/disruptions")
        assert res.status_code == 200
        assert res.json()["data"]["total_active_alerts"] == 0

        res = await ac.get("/v1/alerts/train/12115")
        assert res.status_code == 200
        assert res.json()["data"] == []

        chat_req = {"messages": [{"role": "user", "content": "What mega blocks or route diversions are reported today?"}]}
        res_ai = await ac.post("/api/v1/ai/chat", json=chat_req)
        assert res_ai.status_code == 200
        assert "verified source" in res_ai.json()["data"]["response"]
