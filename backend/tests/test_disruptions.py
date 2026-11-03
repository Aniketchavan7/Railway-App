import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.disruption_service import DisruptionService


def test_disruption_service_queries():
    # 1. Summary query
    summary = DisruptionService.get_disruption_summary()
    assert summary.total_active_alerts >= 6
    assert summary.mega_blocks_count >= 1
    assert summary.diverted_trains_count >= 1
    assert summary.cancelled_trains_count >= 1

    # 2. Train-specific check (Train 12115 Siddheshwar Express diverted via Daund Chord)
    t_alerts = DisruptionService.get_train_disruptions("12115")
    assert len(t_alerts) > 0
    assert "12115" in t_alerts[0].title
    assert "Daund" in t_alerts[0].diverted_via

    # 3. Mega block query
    mb = DisruptionService.get_corridor_mega_blocks("CR")
    assert len(mb) > 0
    assert "Matunga" in mb[0].title or "Mulund" in mb[0].title


@pytest.mark.asyncio
async def test_disruption_endpoints_and_ai():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Check alerts summary
        res = await ac.get("/v1/alerts/disruptions")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["total_active_alerts"] >= 6

        # Check train 12115 disruptions
        res = await ac.get("/v1/alerts/train/12115")
        assert res.status_code == 200
        assert len(res.json()["data"]) >= 1

        # Check AI Chat response on mega block & delayed trains
        chat_req = {
            "messages": [
                {"role": "user", "content": "What mega blocks, delayed trains, or route diversions are reported today?"}
            ]
        }
        res_ai = await ac.post("/api/v1/ai/chat", json=chat_req)
        assert res_ai.status_code == 200
        reply = res_ai.json()["data"]["response"]
        assert "Mega Block" in reply or "Disruption" in reply
        assert "12115" in reply or "Matunga" in reply
