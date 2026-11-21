# Database Schema & Indexing Strategy

## Core Tables
- `trains`: Primary schedule and train identity metadata
- `stations`: Geospatial station coordinates and junction codes
- `live_positions`: Timescale partitioned telemetry events
