"""Unit tests for Prometheus metrics generator."""

import pytest
from app.routers.system import prometheus_metrics


@pytest.mark.asyncio
async def test_metrics_plain_text_response():
    """Verify metrics generator emits valid Prometheus gauge lines."""
    response = await prometheus_metrics()
    assert response.status_code == 200
    assert "text/plain" in response.media_type
    body = response.body.decode("utf-8")
    assert "railpulse_uptime_seconds" in body
    assert "railpulse_providers_registered" in body
    assert "railpulse_status 1" in body
