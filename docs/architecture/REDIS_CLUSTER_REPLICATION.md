# Scaling Architecture: Multi-Region Redis Replication

## 1. Read Topology
To support 100,000+ concurrent train schedule lookups during peak commute hours, timetable data is distributed across read replicas in 3 geographical regions:
- Primary Master: `ap-south-1` (Mumbai)
- Edge Replicas: `ap-south-2` (Hyderabad), `ap-southeast-1` (Singapore)

## 2. Invalidation Strategy
Timetable updates trigger Redis Pub/Sub invalidation channels broadcasting cache key evictions across all region replicas simultaneously.
