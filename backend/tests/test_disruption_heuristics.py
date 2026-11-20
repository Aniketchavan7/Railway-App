"""Unit tests for disruption filtering and summary aggregation heuristics."""

import pytest
from datetime import datetime, timezone
from app.schemas.disruptions import DisruptionSeverity, DisruptionType, RailwayAlert
from app.services.disruption_service import DisruptionService, OFFICIAL_RAILWAY_ALERTS


@pytest.fixture
def mock_railway_alerts():
    """Temporarily inject synthetic alerts to test service filtering heuristics."""
    synthetic = [
        {
            "id": "ALT-001",
            "title": "Central Railway Sunday Mega Block",
            "alert_type": DisruptionType.MEGA_BLOCK,
            "severity": DisruptionSeverity.MEDIUM,
            "zone": "CR",
            "section_or_corridor": "CSMT - KALYAN",
            "reason": "Engineering track renewal",
            "action_advised": "Board via harbor or trans-harbor lines",
            "impact_description": "Suburban services diverted to slow line.",
            "effective_from": "2026-11-20T00:00:00Z",
            "effective_to": "2026-11-20T23:59:59Z",
            "train_number": None,
            "skipped_halts": [],
        },
        {
            "id": "ALT-002",
            "title": "12101 Jnaneswari Express Route Diversion",
            "alert_type": DisruptionType.ROUTE_DIVERSION,
            "severity": DisruptionSeverity.HIGH,
            "zone": "SER",
            "section_or_corridor": "KGP - TATA",
            "reason": "Overhead equipment maintenance",
            "action_advised": "Check revised schedule at intermediate stations",
            "impact_description": "Diverted via Adra due to track maintenance.",
            "effective_from": "2026-11-20T00:00:00Z",
            "effective_to": "2026-11-20T23:59:59Z",
            "train_number": "12101",
            "skipped_halts": ["CKP"],
        },
        {
            "id": "ALT-003",
            "title": "Local Passenger Train Cancellation",
            "alert_type": DisruptionType.CANCELLATION,
            "severity": DisruptionSeverity.CRITICAL,
            "zone": "WR",
            "section_or_corridor": "BVI - VR",
            "reason": "Heavy waterlogging",
            "action_advised": "Seek alternative transit",
            "impact_description": "Service cancelled for waterlogging.",
            "effective_from": "2026-11-20T00:00:00Z",
            "effective_to": "2026-11-20T23:59:59Z",
            "train_number": "90001",
            "skipped_halts": [],
        },
    ]

    original = list(OFFICIAL_RAILWAY_ALERTS)
    OFFICIAL_RAILWAY_ALERTS.clear()
    OFFICIAL_RAILWAY_ALERTS.extend(synthetic)
    yield synthetic
    OFFICIAL_RAILWAY_ALERTS.clear()
    OFFICIAL_RAILWAY_ALERTS.extend(original)


def test_disruption_summary_counts(mock_railway_alerts):
    """Verify aggregated summary count breakdown."""
    summary = DisruptionService.get_disruption_summary()
    assert summary.total_active_alerts == 3
    assert summary.mega_blocks_count == 1
    assert summary.diverted_trains_count == 1
    assert summary.cancelled_trains_count == 1
    assert summary.delayed_trains_count == 0


def test_disruption_filter_by_zone(mock_railway_alerts):
    """Verify zone-based alert filtering."""
    cr_alerts = DisruptionService.get_all_alerts(zone="CR")
    assert len(cr_alerts) == 1
    assert cr_alerts[0].id == "ALT-001"

    wr_alerts = DisruptionService.get_all_alerts(zone="WR")
    assert len(wr_alerts) == 1
    assert wr_alerts[0].id == "ALT-003"


def test_disruption_filter_by_train_number(mock_railway_alerts):
    """Verify specific train number matching."""
    train_alerts = DisruptionService.get_train_disruptions("12101")
    assert len(train_alerts) == 1
    assert train_alerts[0].train_number == "12101"
    assert "CKP" in train_alerts[0].skipped_halts
