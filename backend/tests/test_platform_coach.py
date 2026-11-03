import pytest
from app.services.orchestrator import orchestrator
from app.ai.tools import get_platform_coach_location
import json


@pytest.mark.asyncio
async def test_coach_platform_enrichment():
    """Verify coaches are enriched with platform poles, distance from engine, and FOB markers."""
    comp = await orchestrator.get_coach_composition("22225")
    assert comp is not None
    assert comp.total_coaches > 0
    assert comp.total_length_meters > 0
    assert comp.engine_direction in ["FRONT", "REAR"]

    for idx, coach in enumerate(comp.coaches, start=1):
        assert coach.platform_pole_number == idx
        assert coach.distance_from_engine_m == (idx - 1) * 24
        assert coach.nearest_fob is not None
        assert "FOB" in coach.nearest_fob


@pytest.mark.asyncio
async def test_ai_tool_platform_coach_location():
    """Verify get_platform_coach_location returns exact pole and walking advisory."""
    res_str = await get_platform_coach_location.ainvoke({
        "train_number": "12115",
        "coach_code": "S2",
    })
    assert res_str is not None
    data = json.loads(res_str)
    assert data["train_number"] == "12115"
    assert data["coach_code"] == "S2"
    assert data["platform_pole_number"] > 0
    assert data["distance_from_engine_meters"] >= 0
    assert "FOB" in data["nearest_foot_overbridge"]
    assert "Platform Pole" in data["platform_walking_advisory"]
