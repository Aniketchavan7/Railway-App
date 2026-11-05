import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_all_11_railway_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Root & Health Checks
        res = await ac.get("/")
        assert res.status_code == 200
        assert res.json()["status"] == "OK"

        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["data"]["status"] == "HEALTHY"

        res = await ac.get("/api/system/health")
        assert res.status_code == 200

        # 2. Live Status (both /api/v1 and /v1 aliases)
        res = await ac.get("/api/v1/trains/12101/status")
        assert res.status_code == 200
        assert res.json()["success"] is True

        res = await ac.get("/v1/train/12115/status")
        assert res.status_code == 200
        data_12115 = res.json()["data"]
        assert data_12115["train_name"] == "Siddheshwar Superfast Express"

        # 3. Schedule
        res = await ac.get("/v1/train/12101/schedule")
        assert res.status_code == 200

        # 4. Route
        res = await ac.get("/v1/train/12101/route")
        assert res.status_code == 200

        # 5. Train Search
        res = await ac.get("/v1/trains/search?q=12101")
        assert res.status_code == 200

        # 6. Station Search & Station by Code
        res = await ac.get("/v1/stations/search?q=Pune")
        assert res.status_code == 200

        res = await ac.get("/v1/station/PUNE")
        assert res.status_code == 200
        assert res.json()["data"]["station_code"] == "PUNE"

        # 7. Station Live Board
        res = await ac.get("/v1/stations/PUNE/live")
        assert res.status_code == 200

        # 8. Coach Composition
        res = await ac.get("/v1/train/12101/coaches")
        assert res.status_code == 200

        # 9. Platform Numbers
        res = await ac.get("/v1/train/12101/platforms")
        assert res.status_code == 200

        # 10. Fare Enquiry
        res = await ac.get("/v1/train/12101/fare?origin=CSMT&dest=PUNE")
        assert res.status_code == 200

        # 11. PNR Status
        res = await ac.get("/v1/pnr/1234567890")
        assert res.status_code == 200
        assert res.json()["data"]["pnr"] == "1234567890"

        # 12. Passenger GPS: the report is checked rather than simply relayed
        res = await ac.post("/v1/train/12115/telemetry/report", json={
            "reporter_id": "api-test-reporter",
            "latitude": 19.0178,
            "longitude": 72.8478,
            "speed_kmph": 88.0,
            "accuracy_meters": 4.5,
        })
        assert res.status_code == 200
        assert res.json()["data"]["status"] in ("pending", "accepted", "rejected")

        res = await ac.get("/v1/train/12115/crowd")
        assert res.status_code == 200
        assert "active_reporters" in res.json()["data"]

        # 13. Station-to-Station Route Finder
        res = await ac.get("/v1/trains/between?from_station=CSMT&to_station=PUNE")
        assert res.status_code == 200
        data_between = res.json()["data"]
        assert data_between["count"] >= 5
        assert any(t["train_number"] == "12123" for t in data_between["trains"])
        assert any(t["train_number"] == "22225" for t in data_between["trains"])
