# GTFS Realtime Feed Ingestion Specification

## 1. Protobuf Entities
Parses TripUpdate, VehiclePosition, and Alert entities from transit protobuf streams.

## 2. Telemetry Normalization
Coordinates are re-projected to EPSG:4326 with timestamp delta tracking.
