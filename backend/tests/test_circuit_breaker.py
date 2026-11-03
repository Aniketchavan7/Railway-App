import time
from app.providers.circuit_breaker import CircuitBreaker, CircuitState


def test_circuit_breaker_transitions():
    cb = CircuitBreaker("test_provider", failure_threshold=2, recovery_timeout_seconds=0.2)
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True

    # 1st failure
    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True

    # 2nd failure -> Tripped to OPEN
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # Wait for recovery timeout
    time.sleep(0.25)
    # Probing allowed in HALF_OPEN
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Success resets to CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.failure_count == 0
