"""The behaviour passengers depend on, using provider responses shaped like the real API."""
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from app.ai.agent import _is_status_question, railway_ai
from app.config import settings
from app.main import app
from app.providers.base import ProviderUnavailable
from app.providers.railway_engine import RailwayEngineProvider
from app.providers.registry import registry
from app.schemas.ai import ChatMessage
from app.schemas.status import PassengerTelemetryReport
from app.services import crowd_service
from app.services.orchestrator import LiveDataUnavailable, orchestrator
from app.services.train_schedule_service import DAY_NAMES, IST, TrainOperationsMetadata
from tests.conftest import upstream_status


def now_dates():
    today = datetime.now(IST)
    return (today - timedelta(days=1)).strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")


@pytest.fixture
def no_run_today(monkeypatch):
    """Makes 22226 a train with no service today, whichever day the tests run on."""
    today = DAY_NAMES[datetime.now(IST).weekday()]
    profile = TrainOperationsMetadata.TRAIN_PROFILES["22226"]
    monkeypatch.setitem(profile, "days_of_run", [d for d in DAY_NAMES if d != today])


def fake_provider(monkeypatch, yesterday=None, today=None, unavailable=False):
    """Provider that answers per journey date, as the real one does with ?date=."""
    y_date, t_date = now_dates()
    calls = []

    async def fake_get(self, path, params=None):
        calls.append((path, params))
        if unavailable:
            raise ProviderUnavailable("HTTP 429")
        if path.endswith("/status"):
            date = (params or {}).get("date")
            return {y_date: yesterday, t_date: today}.get(date)
        return None

    monkeypatch.setattr(RailwayEngineProvider, "_get", fake_get)
    monkeypatch.setattr(settings, "ENABLE_SIMULATOR", False)
    return calls


# ---------- which journey, and what state ----------

async def test_train_that_left_yesterday_is_running_not_scheduled(monkeypatch):
    """The original bug: 12951 at 02:05 IST was shown as "not started"."""
    fake_provider(monkeypatch, yesterday=upstream_status(), today=upstream_status(status="NOT_STARTED", current=("MMCT", "Mumbai Central"), previous=None, upcoming=("BVI", "Borivali")))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "RUNNING"
    assert status.current_station_code == "CMU"
    assert status.next_station_code == "KOTA"
    assert status.journey_date == now_dates()[0]
    assert status.journey_date_label is not None


async def test_today_only_journey_not_started(monkeypatch):
    fake_provider(monkeypatch, today=upstream_status(status="NOT_STARTED", current=("MMCT", "Mumbai Central"), previous=None, upcoming=("BVI", "Borivali")))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "NOT_STARTED"
    assert status.runs_today is True


async def test_both_journeys_running_reports_today_and_mentions_yesterday(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(), today=upstream_status(current=("BVI", "Borivali"), previous=("MMCT", "Mumbai Central"), upcoming=("ST", "Surat")))
    status = await orchestrator.get_live_status("12951")
    assert status.current_station_code == "BVI"
    assert "also still running" in status.also_running_note


async def test_completed_train_is_reached_at_destination(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(status="COMPLETED", current=("NDLS", "New Delhi"), upcoming=None))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "COMPLETED"
    assert (status.latitude, status.longitude) == pytest.approx((28.6415, 77.2195))
    assert all(h.has_arrived and h.has_departed for h in status.halts)


async def test_cancelled_is_read_from_provider_exceptions(monkeypatch):
    fake_provider(monkeypatch, today=upstream_status(exceptions=[{"type": "CANCELLED", "message": "Fully cancelled"}]))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "CANCELLED"
    assert status.latitude is None


async def test_no_record_on_either_day_is_not_running_with_no_marker(monkeypatch, no_run_today):
    fake_provider(monkeypatch)
    status = await orchestrator.get_live_status("22226")
    assert status.service_state == "NOT_RUNNING_TODAY"
    assert status.latitude is None and status.longitude is None
    assert status.position_basis == "NONE"
    assert status.next_run_date is not None


async def test_unknown_number_is_not_found_rather_than_invented(monkeypatch):
    fake_provider(monkeypatch)
    assert await orchestrator.get_live_status("99999") is None


async def test_journey_older_than_provider_window_says_may_be_running(monkeypatch):
    """12101 takes over a day, but the provider only looks back to yesterday."""
    fake_provider(monkeypatch)
    # Thursday 02:05 IST: 12101 left on Tuesday evening, Wednesday and Thursday have no journey.
    fixed = datetime(2026, 11, 5, 2, 5, tzinfo=IST).astimezone(timezone.utc)
    from app.services.journey_resolver import no_record_status
    status = no_record_status("12101", fixed)
    assert status.service_state == "UNKNOWN"
    assert "may still be" in status.service_notice.lower()


# ---------- provider outages are not facts about trains ----------

async def test_rate_limit_is_not_reported_as_not_running(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    status = await orchestrator.get_live_status("22226")
    assert status.service_state == "UNKNOWN"
    assert status.running_status == "Live data unavailable"
    assert status.latitude is None


async def test_rate_limit_trips_the_circuit_breaker(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    for _ in range(3):
        await orchestrator.get_live_status("22226")
    assert registry.circuit_breakers["railway_engine"].failure_count >= 3


async def test_outage_for_unknown_train_is_503_not_404(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    with pytest.raises(LiveDataUnavailable):
        await orchestrator.get_live_status("99999")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        assert (await ac.get("/api/v1/trains/99999/status")).status_code == 503


async def test_outage_serves_last_known_marked_stale(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    assert (await orchestrator.get_live_status("12951")).freshness.value == "LIVE"

    from app.cache.redis_client import cache
    for key in list(cache._memory._store):
        if key.startswith("railpulse:journey:"):
            del cache._memory._store[key]
    fake_provider(monkeypatch, unavailable=True)
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "RUNNING"
    assert status.freshness.value == "STALE"


def test_simulator_never_runs_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_SIMULATOR", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.simulator_enabled is False
    names = [p.provider_name for p in registry.get_providers_for_capability("LIVE_STATUS")]
    assert "offline_simulator" not in names


async def test_real_pnr_never_gets_a_made_up_booking():
    from app.providers.simulator import OfflineSimulatorProvider
    assert await OfflineSimulatorProvider().get_pnr_status("9876543210") is None


async def test_pnr_outage_is_503_not_booking_not_found(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/v1/pnr/9876543210")
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"]


# ---------- map position ----------

async def test_missing_coordinates_are_never_copied_from_the_first_halt(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(current=("ZZZ", "Unknown Halt"), previous=None, upcoming=("YYY", "Other Halt")))
    status = await orchestrator.get_live_status("12951")
    assert status.latitude is None
    assert status.position_basis == "NONE"
    assert "ZZZ" in status.position_label or "Unknown Halt" in status.position_label


async def test_running_train_with_two_known_stations_is_labelled_estimate(monkeypatch):
    eta = (datetime.now(IST) + timedelta(minutes=60)).isoformat()
    fake_provider(monkeypatch, yesterday=upstream_status(current=("BRC", "Vadodara Jn"), previous=("ST", "Surat"), upcoming=("KOTA", "Kota Jn"), eta=eta))
    status = await orchestrator.get_live_status("12951")
    assert status.position_basis in ("ESTIMATED", "STATION")
    assert status.location_type.value in ("APPLICATION_ESTIMATED", "STATION_OBSERVED")
    assert status.latitude is not None
    assert status.latitude != pytest.approx(18.9696)  # Not stuck at origin


async def test_position_between_stations_uses_section_time():
    from app.schemas.status import StationHalt
    from app.services.position_service import segment_fraction
    a = StationHalt(station_code="A", station_name="A", departure_time="10:00")
    b = StationHalt(station_code="B", station_name="B", arrival_time="11:00")
    eta = datetime(2026, 11, 5, 11, 0, tzinfo=IST)
    assert segment_fraction(a, b, eta, datetime(2026, 11, 5, 10, 30, tzinfo=IST)) == pytest.approx(0.5)
    assert segment_fraction(a, b, eta, datetime(2026, 11, 5, 9, 0, tzinfo=IST)) == 0.0
    # Late ETA: never claims to have arrived until the provider reports it.
    assert segment_fraction(a, b, eta, datetime(2026, 11, 5, 12, 0, tzinfo=IST)) == pytest.approx(0.95)


async def test_timeline_advances_from_provider_position(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(current=("BRC", "Vadodara Jn"), previous=("ST", "Surat"), upcoming=("KOTA", "Kota Jn")))
    status = await orchestrator.get_live_status("12951")
    assert sum(1 for h in status.halts if h.has_arrived) > 1
    assert status.halts[0].has_departed is True
    assert status.halts[-1].has_arrived is False


# ---------- found by testing against the real provider ----------

async def test_frozen_running_record_from_yesterday_is_not_running(monkeypatch):
    """Provider said 22226 was RUNNING near Sion, 14 hours after it was due at Dadar."""
    old_eta = (datetime.now(IST) - timedelta(hours=14)).isoformat()
    fake_provider(monkeypatch, yesterday=upstream_status(train="22226", current=("SION", "Sion"), previous=None, upcoming=("DR", "Dadar"), eta=old_eta))
    status = await orchestrator.get_live_status("22226")
    assert status.service_state != "RUNNING"


async def test_frozen_record_for_today_is_marked_out_of_date(monkeypatch):
    old_eta = (datetime.now(IST) - timedelta(hours=5)).isoformat()
    fake_provider(monkeypatch, today=upstream_status(eta=old_eta))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "RUNNING"
    assert status.freshness.value == "STALE"
    assert "out of date" in status.service_notice


async def test_late_train_with_a_future_eta_is_not_frozen(monkeypatch):
    eta = (datetime.now(IST) + timedelta(minutes=20)).isoformat()
    fake_provider(monkeypatch, yesterday=upstream_status(delay=400, eta=eta))
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "RUNNING"
    assert status.freshness.value == "LIVE"


async def test_schedule_rate_limit_does_not_block_live_status(monkeypatch):
    """A 429 on /schedule tripped the shared breaker, hiding status calls that were working."""
    y_date, t_date = now_dates()

    async def fake_get(self, path, params=None):
        if path.endswith("/status"):
            return {y_date: upstream_status()}.get((params or {}).get("date"))
        raise ProviderUnavailable("HTTP 429")

    monkeypatch.setattr(RailwayEngineProvider, "_get", fake_get)
    monkeypatch.setattr(settings, "ENABLE_SIMULATOR", False)
    for _ in range(5):
        await orchestrator.get_route("12951")
        await orchestrator.get_coach_composition("12951")
        await orchestrator.get_schedule("12951")
    assert registry.circuit_breakers["railway_engine"].can_execute() is True
    assert (await orchestrator.get_live_status("12951")).service_state == "RUNNING"


async def test_stations_off_the_timetable_still_get_coordinates(monkeypatch):
    """Intermediate stations like Dhuankheri are not stops, but the train is often near one."""
    from app.services.reference_lookup import station_coords
    assert station_coords("DKRA") is not None
    assert station_coords("HPH") is not None
    fake_provider(monkeypatch, yesterday=upstream_status(current=("DKRA", "Dhuankheri"), previous=None, upcoming=("KOTA", "Kota Jn")))
    status = await orchestrator.get_live_status("12951")
    assert status.position_basis == "ESTIMATED"
    # Between the two stations, not sitting on either.
    assert 24.5 < status.latitude < 25.3
    assert status.latitude != pytest.approx(25.2185)


def test_estimate_works_back_from_eta():
    from app.services.position_service import eta_fraction
    a, b = (24.0, 75.0), (25.0, 75.0)  # About 111 km
    now = datetime(2026, 11, 5, 2, 0, tzinfo=IST)
    # 55 minutes out at 60 km/h is about 55 km, so roughly halfway.
    assert eta_fraction(a, b, now + timedelta(minutes=55), now) == pytest.approx(0.5, abs=0.02)
    assert eta_fraction(a, b, now - timedelta(minutes=5), now) == pytest.approx(0.95)
    assert eta_fraction(a, b, None, now) is None


def test_route_finder_only_lists_trains_that_cover_the_section():
    numbers = {t["train_number"] for t in TrainOperationsMetadata.get_trains_between_stations("CSMT", "PUNE")}
    assert {"12123", "22225"} <= numbers
    assert "12158" not in numbers  # Solapur to Pune never touches Mumbai
    assert "12157" not in numbers  # Pune to Solapur goes the other way
    assert "12051" not in numbers  # Mumbai to Madgaon doesn't go via Pune
    assert "12261" not in numbers  # Mumbai to Howrah doesn't go via Pune


async def test_schedule_falls_back_to_timetable_when_provider_is_limited(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    timetable = await orchestrator.get_timetable("12951")
    assert timetable["source_provider"] == "reference_timetable"
    assert timetable["halts"][0]["station_code"] == "MMCT"


# ---------- overnight timetable fallback ----------

def test_overnight_train_is_not_always_running():
    profile = TrainOperationsMetadata.get_profile("12951")
    assert profile["arr_time"] < profile["dep_time"]
    midday = datetime(2026, 11, 5, 12, 0, tzinfo=IST)
    assert TrainOperationsMetadata.check_operational_status("12951", query_dt=midday)["service_state"] == "NOT_STARTED"
    early = datetime(2026, 11, 5, 2, 5, tzinfo=IST)
    assert TrainOperationsMetadata.check_operational_status("12951", query_dt=early)["service_state"] == "RUNNING"


# ---------- passenger GPS ----------

ON_ROUTE = dict(latitude=22.31, longitude=73.18, accuracy_meters=10, speed_kmph=90)  # Vadodara


def ping(reporter="reporter-aaaa", **overrides):
    return PassengerTelemetryReport(reporter_id=reporter, **{**ON_ROUTE, **overrides})


@pytest.fixture
def running_near_vadodara(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(current=("BRC", "Vadodara Jn"), previous=("ST", "Surat"), upcoming=("KOTA", "Kota Jn")))


async def test_one_ping_does_not_move_the_train(running_near_vadodara):
    result = await orchestrator.report_passenger_telemetry("12951", ping())
    assert result["status"] == "pending"
    status = await orchestrator.get_live_status("12951")
    assert status.position_basis != "PASSENGER_GPS"


async def _report_twice(reporter="reporter-aaaa", **overrides):
    base = await orchestrator._build_status("12951")
    start = datetime.now(timezone.utc).timestamp() - 20
    await crowd_service.ingest(ping(reporter, **overrides), base, now=start)
    return await crowd_service.ingest(ping(reporter, **overrides), base, now=start + 10)


async def test_two_consistent_pings_update_position_but_not_state(running_near_vadodara):
    result = await _report_twice()
    assert result.status == "accepted"
    status = await orchestrator.get_live_status("12951")
    assert status.position_basis == "PASSENGER_GPS"
    assert status.latitude == pytest.approx(22.31)
    assert status.crowd_reporters == 1
    assert status.confidence.value == "MEDIUM"
    assert status.service_state == "RUNNING"
    assert status.next_station_code == "KOTA"  # Provider facts survive
    assert "1 passenger" in status.position_label


async def test_two_passengers_agreeing_is_high_confidence(running_near_vadodara):
    await _report_twice("reporter-aaaa")
    await _report_twice("reporter-bbbb", latitude=22.32)
    status = await orchestrator.get_live_status("12951")
    assert status.crowd_reporters == 2
    assert status.confidence.value == "HIGH"
    assert (await crowd_service.get_meta("12951"))["active_reporters"] == 2


async def test_off_route_report_is_rejected(running_near_vadodara):
    # Chennai is nowhere near Mumbai to Delhi.
    result = await orchestrator.report_passenger_telemetry("12951", ping(latitude=13.08, longitude=80.27))
    assert result["status"] == "rejected"
    assert result["reason"] == "off_route"


async def test_on_route_but_far_from_train_is_rejected(running_near_vadodara):
    # On the Mumbai to Delhi line, but far from a train near Vadodara.
    result = await orchestrator.report_passenger_telemetry("12951", ping(latitude=28.64, longitude=77.21))
    assert result["status"] == "rejected"
    assert result["reason"] == "far_from_train"


async def test_low_accuracy_report_is_rejected(running_near_vadodara):
    result = await orchestrator.report_passenger_telemetry("12951", ping(accuracy_meters=900))
    assert result["reason"] == "low_accuracy"


async def test_report_for_train_not_running_is_rejected(monkeypatch, no_run_today):
    fake_provider(monkeypatch)
    result = await orchestrator.report_passenger_telemetry("22226", ping())
    assert result["status"] == "rejected"
    assert result["reason"] == "train_not_running"


async def test_impossible_jump_resets_consistency(running_near_vadodara):
    base = await orchestrator._build_status("12951")
    start = datetime.now(timezone.utc).timestamp() - 30
    await crowd_service.ingest(ping(), base, now=start)
    # Vadodara to Surat is on the route, but no train covers 120 km in 10 seconds.
    result = await crowd_service.ingest(ping(latitude=21.2049, longitude=72.8411), base, now=start + 10)
    assert result.status == "pending"


async def test_passenger_gps_expires_back_to_provider_position(running_near_vadodara):
    await _report_twice()
    expired = datetime.now(timezone.utc).timestamp() + 120
    status = await orchestrator._build_status("12951")
    status = await crowd_service.apply_overlay(status, now=expired)
    assert status.position_basis != "PASSENGER_GPS"


def test_one_outlier_cannot_pull_the_median():
    reports = [
        {"lat": 22.31, "lng": 73.18, "speed": 90, "ts": 1},
        {"lat": 22.31, "lng": 73.19, "speed": 92, "ts": 2},
        {"lat": 25.00, "lng": 75.00, "speed": 90, "ts": 3},
    ]
    fused = crowd_service.fuse(reports)
    assert fused["count"] == 2
    assert fused["lat"] == pytest.approx(22.31)


async def test_passengers_can_show_a_train_the_provider_cannot_see(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    base = await orchestrator._build_status("12951")
    assert base.service_state == "UNKNOWN"
    start = datetime.now(timezone.utc).timestamp() - 20
    await crowd_service.ingest(ping(), base, now=start)
    await crowd_service.ingest(ping(), base, now=start + 10)
    status = await orchestrator.get_live_status("12951")
    assert status.service_state == "RUNNING"
    assert status.position_basis == "PASSENGER_GPS"
    assert "only from passengers" in status.service_notice


def test_crowd_report_rejects_missing_reporter_id():
    with pytest.raises(ValueError):
        PassengerTelemetryReport(latitude=1, longitude=1)


# ---------- live updates ----------

async def test_websocket_refreshes_when_redis_returns_none(monkeypatch):
    """Redis get_message returns None on timeout, which used to stop every update."""
    import asyncio
    from app.services import websocket_hub

    monkeypatch.setattr(websocket_hub, "HEARTBEAT_SECONDS", 0.01)
    fake_provider(monkeypatch, yesterday=upstream_status())

    class FakeRedisPubSub:
        async def get_message(self, ignore_subscribe_messages, timeout):
            return None

    async def subscribe(channel):
        return FakeRedisPubSub()

    sent = []

    class FakeSocket:
        async def send_text(self, text):
            sent.append(text)

    monkeypatch.setattr(websocket_hub.cache, "subscribe_channel", subscribe)
    hub = websocket_hub.WebSocketHub()
    hub.active_connections["12951"] = {FakeSocket()}

    task = asyncio.create_task(hub._train_broadcaster("12951"))
    await asyncio.sleep(0.1)
    task.cancel()
    assert len(sent) >= 2
    assert '"telemetry_update"' in sent[0]


# ---------- assistant ----------

@pytest.mark.parametrize("query,expected", [
    ("12951", True),
    ("what is the latest on 12951", True),
    ("how late is it", True),
    ("fare for 12951", False),
    ("coach position of 12951", False),
    ("hello", False),
])
def test_status_question_routing(query, expected):
    assert _is_status_question(query) is expected


async def test_bare_number_gets_exact_state(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    answer = await railway_ai.answer("12951")
    assert "is running" in answer["response"]
    assert answer["model"] == "live_status_direct"
    assert answer["train"]["service_state"] == "RUNNING"
    assert "Are you on this train?" in answer["response"]


async def test_latest_is_not_treated_as_a_delay_question(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    answer = await railway_ai.answer("latest status of 12951")
    assert "is running" in answer["response"]


async def test_follow_up_uses_the_train_from_history(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status(delay=12))
    history = [ChatMessage(role="user", content="12951"), ChatMessage(role="assistant", content="It is running.")]
    answer = await railway_ai.answer("how late is it?", history=history)
    assert answer["train"]["train_number"] == "12951"
    assert "12 minutes late" in answer["response"]


async def test_follow_up_uses_page_context(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    answer = await railway_ai.answer("where is it now?", context_train="12951")
    assert answer["train"]["train_number"] == "12951"


async def test_no_train_mentioned_asks_instead_of_defaulting(monkeypatch):
    fake_provider(monkeypatch)
    answer = await railway_ai.answer("where is my train?")
    assert "train number" in answer["response"]
    assert answer["train"] is None


async def test_not_running_reply_gives_next_run(monkeypatch, no_run_today):
    fake_provider(monkeypatch)
    answer = await railway_ai.answer("22226")
    assert "not running today" in answer["response"]
    assert "Next run" in answer["response"]


async def test_outage_reply_does_not_claim_a_state(monkeypatch):
    fake_provider(monkeypatch, unavailable=True)
    answer = await railway_ai.answer("99999")
    assert "temporarily unavailable" in answer["response"]


async def test_prompt_contains_current_ist_date():
    from app.ai.agent import _build_system_prompt
    prompt = _build_system_prompt("12951")
    assert datetime.now(IST).strftime("%d %B %Y") in prompt
    assert "12951" in prompt
    assert "22226" not in prompt  # No hard-coded train rules


async def test_client_cannot_choose_the_model(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/v1/ai/chat", json={"messages": [{"role": "user", "content": "12951"}], "model": "expensive/model"})
    assert res.json()["data"]["model"] != "expensive/model"


async def test_no_invented_disruptions(monkeypatch):
    fake_provider(monkeypatch)
    answer = await railway_ai.answer("any mega blocks today?")
    assert "verified source" in answer["response"]


# ---------- found in code review ----------

async def test_cached_reads_do_not_reset_the_breaker(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    await orchestrator.get_live_status("12951")
    breaker = registry.circuit_breakers["railway_engine"]
    breaker.record_failure()
    await orchestrator.get_live_status("12951")  # All from cache
    assert breaker.failure_count == 1


async def test_non_live_success_does_not_reset_the_breaker(monkeypatch):
    async def fake_get(self, path, params=None):
        return {"train_number": "12951", "halts": []} if path.endswith("/schedule") else None

    monkeypatch.setattr(RailwayEngineProvider, "_get", fake_get)
    breaker = registry.circuit_breakers["railway_engine"]
    breaker.record_failure()
    await orchestrator.get_schedule("12951")
    assert breaker.failure_count == 1


@pytest.mark.parametrize("overrides", [
    {"speed_kmph": float("inf")},
    {"speed_kmph": float("nan")},
    {"speed_kmph": -500},
    {"speed_kmph": 99999},
    {"latitude": float("nan")},
    {"longitude": 500},
])
def test_impossible_report_values_are_refused(overrides):
    with pytest.raises(ValueError):
        ping(**overrides)


async def test_infinite_speed_over_http_is_refused_before_it_reaches_viewers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/v1/trains/12951/telemetry/report",
            content='{"reporter_id":"reporter-aaaa","latitude":22.3,"longitude":73.1,"accuracy_meters":10,"speed_kmph":1e999}',
            headers={"content-type": "application/json"},
        )
    assert res.status_code == 422


async def test_assistant_example_number_is_not_the_users_train(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    history = [
        ChatMessage(role="user", content="hello"),
        ChatMessage(role="assistant", content="Please give me a 5-digit train number, such as 12951."),
    ]
    answer = await railway_ai.answer("is my train late?", history=history)
    assert answer["train"] is None
    assert "train number" in answer["response"]


async def test_named_day_gets_a_timetable_answer_not_todays_status(monkeypatch):
    fake_provider(monkeypatch, yesterday=upstream_status())
    answer = await railway_ai.answer("Does 12951 run on Sunday?")
    assert "on that day" in answer["response"]
    assert "It runs on" in answer["response"]


def test_general_question_ignores_the_train_in_context():
    assert _is_status_question("which trains run from Pune to Delhi today?") is False
    assert _is_status_question("does 12951 run today") is True


@pytest.mark.parametrize("raw,exceptions,expected", [
    ("RUNNING", [], "RUNNING"),
    ("NOT_STARTED", [], "NOT_STARTED"),
    ("COMPLETED", [], "COMPLETED"),
    ("RESCHEDULED", [], "NOT_STARTED"),
    ("ARRIVED", [], "RUNNING"),  # At a station along the way
    ("NOT_ARRIVED", [], "UNKNOWN"),
    ("NO_DATA", [], "UNKNOWN"),
    (None, [], "UNKNOWN"),
    ("CANCELLED", [], "CANCELLED"),
    ("RUNNING", [{"type": "CANCELLED"}], "CANCELLED"),
    ("RUNNING", [{"type": "PARTIAL", "message": "Cancelled between X and Y"}], "RUNNING"),
    ("RUNNING", [{"cancelledStations": ["X"]}], "RUNNING"),
])
def test_provider_state_mapping(raw, exceptions, expected):
    from app.providers.railway_engine import _service_state
    assert _service_state(raw, exceptions) == expected


def test_no_record_before_departure_is_not_reported_as_not_running():
    from app.services.journey_resolver import no_record_status
    # Thursday 09:00: 22225 runs on Thursdays at 16:05, and the provider has nothing yet.
    status = no_record_status("22225", datetime(2026, 11, 5, 9, 0, tzinfo=IST))
    assert status.service_state == "NOT_STARTED"
    assert status.runs_today is True


def test_no_record_after_departure_on_a_running_day_is_unknown():
    from app.services.journey_resolver import no_record_status
    status = no_record_status("22225", datetime(2026, 11, 5, 18, 0, tzinfo=IST))
    assert status.service_state == "UNKNOWN"
    assert "no live record" in status.service_notice


def test_no_record_on_a_non_running_day_is_not_running():
    from app.services.journey_resolver import no_record_status
    status = no_record_status("22226", datetime(2026, 11, 5, 9, 0, tzinfo=IST), "rail_radar")
    assert status.service_state == "NOT_RUNNING_TODAY"
    assert status.source_provider == "rail_radar"


def test_stale_records_from_yesterday_do_not_describe_today():
    from app.services.journey_resolver import _pick_journey
    from app.providers.railway_engine import RailwayEngineProvider as Engine
    for state in ("NOT_STARTED", "CANCELLED"):
        record = Engine()._parse_status(upstream_status(status=state), "12951", "2026-11-04")
        assert _pick_journey(record, None) == (None, None)
    done = Engine()._parse_status(upstream_status(status="COMPLETED"), "12951", "2026-11-04")
    assert _pick_journey(done, None)[0] is done


async def test_open_breakers_do_not_record_a_station_as_missing(monkeypatch):
    from app.cache.redis_client import cache
    monkeypatch.setattr(settings, "ENABLE_SIMULATOR", False)
    monkeypatch.setattr(registry, "get_providers_for_capability", lambda capability: [])
    assert await orchestrator.get_station("ZZZZ") is None
    assert await cache.get_json("railpulse:station:ZZZZ") is None


async def test_provider_reported_stop_progress_is_kept(monkeypatch):
    from app.providers.rail_radar import RailRadarProvider
    from app.schemas.status import ConfidenceLevel, FreshnessState, LocationType, RailwayStatus, StationHalt

    now = datetime.now(timezone.utc)

    async def radar_status(self, train_number, journey_date=None):
        return RailwayStatus(
            train_number=train_number, train_name="Test", journey_date=journey_date, running_status="RUNNING",
            source_provider="rail_radar", observed_at=now, fetched_at=now, age_seconds=0,
            freshness=FreshnessState.LIVE, confidence=ConfidenceLevel.MEDIUM, location_type=LocationType.STATION_OBSERVED,
            halts=[
                StationHalt(station_code="ST", station_name="Surat", has_arrived=True, has_departed=True, actual_arrival="19:50"),
                StationHalt(station_code="BRC", station_name="Vadodara", has_arrived=True),
                StationHalt(station_code="KOTA", station_name="Kota"),
            ],
        )

    fake_provider(monkeypatch, unavailable=True)
    monkeypatch.setattr(RailRadarProvider, "get_live_status", radar_status)
    status = await orchestrator.get_live_status("12951")
    assert status.halts[0].actual_arrival == "19:50"
    assert status.current_station_code == "BRC"
    assert status.next_station_code == "KOTA"
    assert status.latitude is not None


def test_malformed_schedule_row_is_skipped():
    from app.services.reference_lookup import halts_from_schedule
    halts = halts_from_schedule({"stops": [
        {"code": "ST", "name": "Surat", "distance": "not a number"},
        {"code": "BRC", "name": "Vadodara", "distance": 393},
    ]})
    assert [h.station_code for h in halts] == ["BRC"]


async def test_passenger_gps_updates_the_observation_time(running_near_vadodara):
    await _report_twice()
    status = await orchestrator.get_live_status("12951")
    assert (datetime.now(timezone.utc) - status.observed_at).total_seconds() < 30


async def test_broadcaster_releases_its_subscription(monkeypatch):
    import asyncio
    from app.services import websocket_hub

    monkeypatch.setattr(websocket_hub, "HEARTBEAT_SECONDS", 0.01)
    fake_provider(monkeypatch, yesterday=upstream_status())
    channel = "train_telemetry:12951"
    hub = websocket_hub.WebSocketHub()
    task = asyncio.create_task(hub._train_broadcaster("12951"))
    await asyncio.sleep(0.03)
    assert len(websocket_hub.cache._memory._subscribers[channel]) == 1
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    await asyncio.sleep(0)
    assert websocket_hub.cache._memory._subscribers[channel] == []
