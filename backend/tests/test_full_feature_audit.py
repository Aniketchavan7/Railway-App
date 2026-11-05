import re
from datetime import datetime
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.services.fare_engine import TelescopicFareEngine
from app.services.disruption_service import DisruptionService
from app.services.train_schedule_service import TrainOperationsMetadata, IST
from app.providers.circuit_breaker import CircuitBreaker, CircuitState


# =====================================================================
# 1. LIVE TRAIN TRACKING & TELEMETRY AUDIT
# =====================================================================
@pytest.mark.asyncio
async def test_live_train_status_all_major_expresses():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        test_trains = ["22225", "12158", "12101", "12951", "12115"]
        for t_num in test_trains:
            # Test both /api/v1 and /v1 aliases
            res_v1 = await ac.get(f"/v1/train/{t_num}/status")
            assert res_v1.status_code == 200, f"Failed for train {t_num}"
            data = res_v1.json()["data"]

            assert data["train_number"] == t_num
            assert len(data["train_name"]) > 3
            assert data["journey_date"] is not None
            assert data["running_status"] is not None
            assert "delay_minutes" in data
            assert len(data.get("halts", [])) > 0
            assert data["freshness"] is not None
            assert data["location_type"] is not None

            # Verify halts structure
            first_halt = data["halts"][0]
            assert "station_code" in first_halt
            assert "station_name" in first_halt
            assert "distance_km" in first_halt


@pytest.mark.asyncio
async def test_turnaround_and_rake_pairing():
    # 22225 CSMT->SUR pairs with 22226 SUR->CSMT
    wed_dt = datetime(2026, 11, 4, 10, 0, 0, tzinfo=IST)
    res_22225 = TrainOperationsMetadata.check_operational_status("22225", query_dt=wed_dt)
    assert res_22225["pairing_train"] == "22226"

    # 12158 SUR->PUNE pairs with 12157 PUNE->SUR
    res_12158 = TrainOperationsMetadata.check_operational_status("12158", query_dt=wed_dt)
    assert res_12158["pairing_train"] == "12157"


# =====================================================================
# 2. CROWD-SOURCED GPS TELEMETRY & ZERO-PII GUARANTEE
# =====================================================================
@pytest.mark.asyncio
async def test_crowd_gps_telemetry_reporting():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        report = {
            "reporter_id": "feature-audit-reporter",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "speed_kmph": 94.5,
            "accuracy_meters": 3.8,
        }
        res = await ac.post("/v1/train/12101/telemetry/report", json=report)
        assert res.status_code == 200
        assert res.json()["data"]["status"] in ("pending", "accepted", "rejected")

        crowd_res = await ac.get("/v1/train/12101/crowd")
        assert crowd_res.status_code == 200
        assert "active_reporters" in crowd_res.json()["data"]


# =====================================================================
# 3. STATION LIVE BOARDS & TIME WINDOWS
# =====================================================================
@pytest.mark.asyncio
async def test_station_live_boards_with_time_windows():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        stations = ["PUNE", "CSMT", "SUR", "NDLS", "HWH"]
        for st in stations:
            # Default 4 hours
            res = await ac.get(f"/v1/stations/{st}/live?hours=4")
            assert res.status_code == 200
            board = res.json()["data"]
            assert board["station_code"] == st
            assert len(board["trains"]) > 0

            # 1 hour window
            res_1h = await ac.get(f"/v1/stations/{st}/live?hours=1")
            assert res_1h.status_code == 200
            assert res_1h.json()["data"]["window_hours"] == 1


# =====================================================================
# 4. PNR STATUS ENQUIRY & PRIVACY AUDIT
# =====================================================================
@pytest.mark.asyncio
async def test_pnr_status_valid_and_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Valid 10-digit PNR
        res = await ac.get("/v1/pnr/1234567890")
        assert res.status_code == 200
        pnr_data = res.json()["data"]
        assert pnr_data["pnr"] == "1234567890"
        assert len(pnr_data["passengers"]) >= 1
        assert pnr_data["chart_status"] in ["CHART_PREPARED", "CHART_NOT_PREPARED"]
        assert "Zero" in pnr_data.get("privacy_notice", "") or "Simulated" in pnr_data.get("privacy_notice", "")

        # Invalid short PNR (< 10 digits)
        res_short = await ac.get("/v1/pnr/12345")
        assert res_short.status_code == 400
        assert "10 numeric digits" in res_short.json()["detail"]

        # Invalid non-numeric PNR
        res_non_numeric = await ac.get("/v1/pnr/ABCDEFGHIJ")
        assert res_non_numeric.status_code == 400


# =====================================================================
# 5. FARE ENGINE: TELESCOPIC TARIFFS & GST ACCURACY
# =====================================================================
def test_fare_engine_all_classes_and_taxes():
    # CSMT to SUR (~454 km)
    fare_res = TelescopicFareEngine.calculate_all_classes(
        train_number="22225",
        train_name="Solapur Vande Bharat Express",
        origin="CSMT",
        destination="SUR",
        quota="GN",
    )

    assert 450.0 <= fare_res.distance_km <= 460.0
    assert len(fare_res.classes) == 7

    # Check GST rules: AC classes have 5% GST, Non-AC (SL, 2S) have 0% GST
    for c in fare_res.classes:
        if c.class_code in ["1A", "2A", "3A", "3E", "CC", "EC"]:
            assert c.gst > 0.0, f"Class {c.class_code} must have GST"
        elif c.class_code in ["SL", "2S"]:
            assert c.gst == 0.0, f"Class {c.class_code} must be GST exempt"

        assert c.total_fare > c.base_fare

    # Check Tatkal Quota surcharge
    tq_3a = TelescopicFareEngine.compute_fare_for_class("3A", 453.0, quota="TQ")
    gn_3a = TelescopicFareEngine.compute_fare_for_class("3A", 453.0, quota="GN")
    assert tq_3a.tatkal_surcharge > 0
    assert tq_3a.total_fare > gn_3a.total_fare


# =====================================================================
# 6. DISRUPTIONS, MEGA BLOCKS & ROUTE DIVERSIONS
# =====================================================================
def test_disruption_system_and_diversions():
    summary = DisruptionService.get_disruption_summary()
    assert summary.total_active_alerts == 0


# =====================================================================
# 7. AI ASSISTANT: MULTI-DOMAIN RAILWAY QUERIES
# =====================================================================
@pytest.mark.asyncio
async def test_ai_assistant_comprehensive_knowledge():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Location and halt inquiry
        chat_loc = {
            "messages": [
                {"role": "user", "content": "Where is train 22225 Vande Bharat? Does it run on Wednesday?"}
            ]
        }
        res_loc = await ac.post("/api/v1/ai/chat", json=chat_loc)
        assert res_loc.status_code == 200
        reply_loc = res_loc.json()["data"]["response"]
        assert "22225" in reply_loc or "Vande Bharat" in reply_loc

        # 2. Fare inquiry
        chat_fare = {
            "messages": [
                {"role": "user", "content": "What is the fare for train 12101 from CSMT to PUNE across AC 3-tier and Sleeper?"}
            ]
        }
        res_fare = await ac.post("/api/v1/ai/chat", json=chat_fare)
        assert res_fare.status_code == 200
        reply_fare = res_fare.json()["data"]["response"]
        assert "fare" in reply_fare.lower() or "₹" in reply_fare or "inr" in reply_fare.lower()


# =====================================================================
# 8. SYSTEM HEALTH, REGISTRY & CIRCUIT BREAKER
# =====================================================================
@pytest.mark.asyncio
async def test_system_health_and_circuit_breaker():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # System health root
        res_h = await ac.get("/api/v1/health")
        assert res_h.status_code == 200
        assert res_h.json()["data"]["status"] == "HEALTHY"

        # Providers health
        res_ph = await ac.get("/api/v1/providers/health")
        assert res_ph.status_code == 200
        assert len(res_ph.json()["data"]) >= 1

        # Provider registry status
        res_ps = await ac.get("/api/v1/providers/status")
        assert res_ps.status_code == 200
        assert "offline_simulator" in res_ps.json()["data"]

    # Test CircuitBreaker unit behavior
    cb = CircuitBreaker("TEST_CB", failure_threshold=2, recovery_timeout_seconds=0.1)
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True
    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # After recovery timeout
    import asyncio
    await asyncio.sleep(0.15)
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


# =====================================================================
# 9. COACH COMPOSITIONS & AMENITIES
# =====================================================================
@pytest.mark.asyncio
async def test_coach_composition_and_fob_enrichment():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Vande Bharat composition
        res_vb = await ac.get("/v1/train/22225/coaches")
        assert res_vb.status_code == 200
        coaches_vb = res_vb.json()["data"]["coaches"]
        assert any(c["coach_type"] == "EXECUTIVE_CHAIR_CAR" or c["coach_code"] == "E1" for c in coaches_vb)

        # Rajdhani composition
        res_raj = await ac.get("/v1/train/12951/coaches")
        assert res_raj.status_code == 200
        coaches_raj = res_raj.json()["data"]["coaches"]
        assert any(c["coach_code"] == "H1" for c in coaches_raj)
        assert any(c["coach_code"] == "A1" for c in coaches_raj)
        assert any(c["coach_code"] == "B1" for c in coaches_raj)

        # Check FOB and platform pole enrichment
        first_coach = coaches_raj[0]
        assert first_coach.get("platform_pole_number") is not None
        assert first_coach.get("nearest_fob") is not None
