from datetime import datetime, timezone, timedelta
import pytest
from app.services.train_schedule_service import TrainOperationsMetadata, IST
from app.providers.simulator import OfflineSimulatorProvider
from app.ai.agent import railway_ai


@pytest.mark.asyncio
async def test_22225_does_not_run_on_wednesday():
    # 2026-11-04 is a Wednesday
    wed_dt = datetime(2026, 11, 4, 10, 0, 0, tzinfo=IST)
    res = TrainOperationsMetadata.check_operational_status("22225", query_dt=wed_dt)
    
    assert res["runs_today"] is False
    assert res["service_state"] == "NOT_RUNNING_TODAY"
    assert "WED" not in res["days_of_run"]
    assert "Wednesday" in res["running_status"] or "Maintenance" in res["service_notice"]
    assert res["pairing_train"] == "22226"


@pytest.mark.asyncio
async def test_22225_runs_on_thursday():
    # 2026-11-05 is a Thursday
    thu_dt = datetime(2026, 11, 5, 10, 0, 0, tzinfo=IST)
    res = TrainOperationsMetadata.check_operational_status("22225", query_dt=thu_dt)
    
    assert res["runs_today"] is True
    assert "THU" in res["days_of_run"]
    # Departs 16:05, so at 10:00 it has NOT_STARTED
    assert res["service_state"] == "NOT_STARTED"


@pytest.mark.asyncio
async def test_12158_morning_completed_midday():
    # 12158 runs 06:30 - 10:30 IST
    # At 08:00 IST -> RUNNING
    morning_dt = datetime(2026, 11, 4, 8, 0, 0, tzinfo=IST)
    res_running = TrainOperationsMetadata.check_operational_status("12158", query_dt=morning_dt)
    assert res_running["runs_today"] is True
    assert res_running["service_state"] == "RUNNING"
    
    # At 11:00 IST -> COMPLETED
    midday_dt = datetime(2026, 11, 4, 11, 0, 0, tzinfo=IST)
    res_completed = TrainOperationsMetadata.check_operational_status("12158", query_dt=midday_dt)
    assert res_completed["runs_today"] is True
    assert res_completed["service_state"] == "COMPLETED"
    assert res_completed["pairing_train"] == "12157"


@pytest.mark.asyncio
async def test_12157_not_started_midday_and_runs_evening():
    # 12157 departs 18:00 IST
    # At 10:30 IST -> NOT_STARTED
    midday_dt = datetime(2026, 11, 4, 10, 30, 0, tzinfo=IST)
    res_not_started = TrainOperationsMetadata.check_operational_status("12157", query_dt=midday_dt)
    assert res_not_started["runs_today"] is True
    assert res_not_started["service_state"] == "NOT_STARTED"
    assert res_not_started["pairing_train"] == "12158"

    # At 19:00 IST -> RUNNING
    evening_dt = datetime(2026, 11, 4, 19, 0, 0, tzinfo=IST)
    res_running = TrainOperationsMetadata.check_operational_status("12157", query_dt=evening_dt)
    assert res_running["service_state"] == "RUNNING"


@pytest.mark.asyncio
async def test_simulator_respects_maintenance_days():
    sim = OfflineSimulatorProvider()
    status_22225 = await sim.get_live_status("22225")
    assert status_22225 is not None
    # Today is Wednesday (2026-11-04)
    assert status_22225.runs_today is False
    assert status_22225.service_state == "NOT_RUNNING_TODAY"
    assert status_22225.speed_kmph == 0.0
    assert "Depot" in (status_22225.current_station or "") or "Non-Operating" in (status_22225.current_station or "")


@pytest.mark.asyncio
async def test_ai_agent_handles_operational_days_and_pair_rake():
    # Test operational day query for 22225
    query_22225 = "does train 22225 run on wednesday?"
    ans_22225 = await railway_ai.answer(query_22225)
    resp_text = ans_22225["response"].lower()
    assert "not run" in resp_text or "does not" in resp_text or "wednesday" in resp_text
    assert "maintenance" in resp_text or "wadi bunder" in resp_text

    # Test multi-train pair rake query (user's exact problem)
    complex_query = (
        "see some train dont run every time like 12157 and 12158 is same up and down "
        "now 12158 is running it will be changed to 12158 it should come there 12158 isnt running "
        "22225 doesnot run on wednesdday how are you fetching wrong info"
    )
    ans_complex = await railway_ai.answer(complex_query)
    resp_complex = ans_complex["response"]
    assert "22225" in resp_complex
    assert "12158" in resp_complex
    assert "12157" in resp_complex
    resp_lower = resp_complex.lower()
    assert (
        "not run" in resp_lower
        or "not operate" in resp_lower
        or "does not run" in resp_lower
        or "not running today" in resp_lower
    )
    assert ans_complex["grounded"] is True
