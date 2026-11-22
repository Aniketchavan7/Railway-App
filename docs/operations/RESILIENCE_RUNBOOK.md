# Operations Runbook: Redis Failover & Circuit Breaker Recovery

## 1. Failure Modes & Detection
When the primary Redis cache cluster fails or encounters network partitions:
- Circuit breaker state transitions from `CLOSED` to `OPEN` after 5 consecutive timeout events (> 500ms).
- Immediate fallback to local in-memory LRU cache (`MemoryCache`) with 60-second TTL.
- Alert dispatched to Sentry and Prometheus metric `railway_circuit_breaker_tripped_total` incremented.

## 2. Recovery Procedure
1. Verify replica synchronization status in Redis Sentinel.
2. Promote healthy replica to primary via `SENTINEL failover mymaster`.
3. Allow 30-second half-open probe cycle (`HALF_OPEN`) to validate latency before resetting circuit breaker to `CLOSED`.
