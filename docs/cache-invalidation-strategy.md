# Cache Invalidation Strategy

## Overview
Details the tiered memory hierarchy and Redis cache invalidation protocol for live train schedule queries.

## Tiered Cache Architecture
- **L1 (In-Memory LRU)**: Local Python cache for static station metadata (TTL: 24h).
- **L2 (Upstash Redis)**: Distributed cache for dynamic schedule timelines and platform assignments (TTL: 60s).
- **L3 (Neon Postgres)**: Ground truth persistence store with read replicas.

## Invalidation Triggers
- Automatic event-driven invalidation via Redis keyspace notifications when platform change alerts arrive.
