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
async def test_22226_runs_on_wednesday_and_not_on_thursday():
    # 2026-11-04 is Wednesday (22226 operates SUR -> CSMT in morning)
    wed_dt = datetime(2026, 11, 4, 10, 0, 0, tzinfo=IST)
    res_wed = TrainOperationsMetadata.check_operational_status("22226", query_dt=wed_dt)
    assert res_wed["runs_today"] is True
    assert "WED" in res_wed["days_of_run"]
    assert res_wed["service_state"] == "RUNNING"
    assert res_wed["pairing_train"] == "22225"

    # 2026-11-05 is Thursday (22226 does NOT operate)
    thu_dt = datetime(2026, 11, 5, 10, 0, 0, tzinfo=IST)
    res_thu = TrainOperationsMetadata.check_operational_status("22226", query_dt=thu_dt)
    assert res_thu["runs_today"] is False
    assert res_thu["service_state"] == "NOT_RUNNING_TODAY"
    assert "THU" not in res_thu["days_of_run"]


@pytest.mark.asyncio
async def test_12101_and_12102_days_of_run():
    # 12101 runs Mon, Tue, Fri, Sat (does NOT run on Wednesday)
    wed_dt = datetime(2026, 11, 4, 10, 0, 0, tzinfo=IST)
    res_12101_wed = TrainOperationsMetadata.check_operational_status("12101", query_dt=wed_dt)
    assert res_12101_wed["runs_today"] is False
    assert res_12101_wed["service_state"] == "NOT_RUNNING_TODAY"

    # 12102 runs Mon, Wed, Thu, Sun (DOES run on Wednesday)
    res_12102_wed = TrainOperationsMetadata.check_operational_status("12102", query_dt=wed_dt)
    assert res_12102_wed["runs_today"] is True


@pytest.mark.asyncio
async def test_all_32_known_trains_indexed():
    from app.services.orchestrator import KNOWN_TRAINS
    assert len(KNOWN_TRAINS) >= 32
    for t_num, t_name in KNOWN_TRAINS.items():
        profile = TrainOperationsMetadata.get_profile(t_num)
        assert profile is not None, f"Train {t_num} ({t_name}) missing from TrainOperationsMetadata"
        assert profile["number"] == t_num
        assert len(profile["days_of_run"]) > 0


@pytest.mark.asyncio
async def test_simulator_respects_maintenance_days(monkeypatch):
    wednesday = datetime(2026, 11, 4, 10, 0, 0, tzinfo=IST)

    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return wednesday.astimezone(tz) if tz else wednesday

    monkeypatch.setattr("app.providers.simulator.datetime", FrozenDatetime)
    sim = OfflineSimulatorProvider()
    status_22225 = await sim.get_live_status("22225")
    assert status_22225 is not None
    assert status_22225.runs_today is False
    assert status_22225.service_state == "NOT_RUNNING_TODAY"
    assert status_22225.speed_kmph == 0.0
    assert "Depot" in (status_22225.current_station or "") or "Non-Operating" in (status_22225.current_station or "")


@pytest.mark.asyncio
async def test_ai_agent_handles_operational_days_and_pair_rake():
    ans_22225 = await railway_ai.answer("does train 22225 run on wednesday?")
    assert ans_22225["grounded"] is True
    assert "22225" in ans_22225["response"]

    # Several trains in one message: each must be answered.
    ans_multi = await railway_ai.answer("what is the status of 12157 and 12158 and 22225 right now")
    for number in ("12157", "12158", "22225"):
        assert number in ans_multi["response"]
    assert ans_multi["grounded"] is True


def test_22225_running_day_answer():
    from app.ai.agent import _running_day_answer
    assert "does not run" in _running_day_answer("22225", "WED")
    assert "runs on that day" in _running_day_answer("22225", "THU")
