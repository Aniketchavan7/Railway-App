import time
from enum import Enum
from typing import Optional


class CircuitState(str, Enum):
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Tripped, fast-failing
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 2,
        recovery_timeout_seconds: float = 60.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_seconds
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_success_time: Optional[float] = None

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True

        now = time.time()
        if self.state == CircuitState.OPEN:
            if self.last_failure_time and (now - self.last_failure_time) > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False

        # If HALF_OPEN, allow probe
        return True

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_success_time = time.time()

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN

    def to_dict(self):
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "last_success_time": self.last_success_time,
        }
