# Real-Time Geospatial Telemetry Architecture

## Overview
This document specifies the sub-second GPS coordinate ingestion and map rendering pipeline used in the Railway-App production tracking system.

## Ingestion Pipeline
1. **WebSocket Ingest**: High-throughput asyncio WebSocket receiver receiving raw NMEA/GTFS-RT sentences.
2. **Buffer Queue**: In-memory ring buffer (10,000 events) decoupling network I/O from database writes.
3. **Spatial Indexing**: MapLibre vector tile server matching train coordinates to rail line geometries.
4. **Broadcast**: Redis Pub/Sub distributing updates to active commuter browser connections.

## Latency SLA
- Edge Ingest to Redis Publish: < 45ms (p95)
- WebSocket Push to Map Render: < 120ms (p95)
