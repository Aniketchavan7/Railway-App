import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_all_11_railway_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Health
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "HEALTHY"

        # 2. Live Status
        res = await ac.get("/api/v1/trains/12101/status")
        assert res.status_code == 200
        assert res.json()["success"] is True

        # 3. Schedule
        res = await ac.get("/api/v1/trains/12101/schedule")
        assert res.status_code == 200

        # 4. Route
        res = await ac.get("/api/v1/trains/12101/route")
        assert res.status_code == 200

        # 5. Train Search
        res = await ac.get("/api/v1/trains/search?q=12101")
        assert res.status_code == 200

        # 6. Station Search
        res = await ac.get("/api/v1/stations/search?q=Pune")
        assert res.status_code == 200

        # 7. Station Live Board
        res = await ac.get("/api/v1/stations/PUNE/live")
        assert res.status_code == 200

        # 8. Coach Composition
        res = await ac.get("/api/v1/trains/12101/coaches")
        assert res.status_code == 200

        # 9. Platform Numbers
        res = await ac.get("/api/v1/trains/12101/platforms")
        assert res.status_code == 200

        # 10. Fare Enquiry
        res = await ac.get("/api/v1/trains/12101/fare?origin=CSMT&dest=PUNE")
        assert res.status_code == 200

        # 11. PNR Status
        res = await ac.get("/api/v1/pnr/1234567890")
        assert res.status_code == 200
        assert res.json()["data"]["pnr"] == "1234567890"
