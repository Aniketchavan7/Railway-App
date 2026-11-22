# Distributed Load Testing Plan

## Goals
Verify system resilience under commuter peak hour traffic (8:00 AM - 10:00 AM IST) targeting 10,000 concurrent WebSocket connections.

## Test Matrix
| Scenario | Virtual Users (VUs) | Duration | Target Latency | Error Rate |
| :--- | :--- | :--- | :--- | :--- |
| Baseline | 500 | 10 min | < 50ms | 0.00% |
| Stress | 5,000 | 20 min | < 150ms | < 0.01% |
| Peak Spike | 10,000 | 5 min | < 250ms | < 0.05% |
