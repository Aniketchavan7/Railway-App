"""Concurrent and state-transition tests for provider CircuitBreaker."""

import time
import pytest
from app.providers.circuit_breaker import CircuitBreaker, CircuitState


def test_circuit_breaker_trip_and_half_open_recovery():
    """Verify state transitions: CLOSED -> OPEN -> HALF_OPEN -> CLOSED."""
    cb = CircuitBreaker("test-provider", failure_threshold=3, recovery_timeout_seconds=0.1)
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True

    # Record 2 failures - still closed
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True

    # 3rd failure trips the breaker
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # Wait for recovery timeout
    time.sleep(0.15)
    # can_execute transitions to HALF_OPEN probe
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Success resets to CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0


def test_circuit_breaker_consecutive_failures_remain_open():
    """Verify failures during HALF_OPEN keep breaker OPEN."""
    cb = CircuitBreaker("failing-provider", failure_threshold=2, recovery_timeout_seconds=0.05)
    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.OPEN

    time.sleep(0.08)
    assert cb.can_execute() is True  # Enters HALF_OPEN

    # Probe fails
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
