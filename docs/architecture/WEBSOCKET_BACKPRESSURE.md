# Streaming Architecture: WebSocket Backpressure & Ring Buffer Design

## 1. Problem
Slow client devices on 2G/3G connections cannot drain WebSocket frames as rapidly as backend GPS ingestors publish updates (10Hz). Unbounded queues cause resident memory leaks.

## 2. Solution: Bounded Ring Buffer
Each client connection is assigned a ring buffer of capacity $N = 250$ frames:
- If queue depth reaches capacity, incoming updates overwrite the oldest pending coordinate frame.
- High-priority operational alerts (station arrival, platform changes) bypass the ring buffer and are delivered immediately.
