import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Set
from fastapi import WebSocket
from app.cache.redis_client import cache
from app.services.orchestrator import orchestrator

logger = logging.getLogger("railpulse.services.websocket_hub")


class WebSocketHub:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.active_tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def connect(self, train_number: str, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if train_number not in self.active_connections:
                self.active_connections[train_number] = set()
            self.active_connections[train_number].add(websocket)

            # Start subscriber background task if not already running
            if train_number not in self.active_tasks:
                task = asyncio.create_task(self._train_broadcaster(train_number))
                self.active_tasks[train_number] = task

        logger.info("Client connected to WS for train %s (total: %d)", train_number, len(self.active_connections[train_number]))

        # Send initial status immediately upon connection
        try:
            status = await orchestrator.get_live_status(train_number)
            if status:
                packet = self._build_packet(train_number, status.model_dump(mode="json"))
                await websocket.send_text(json.dumps(packet))
        except Exception as e:
            logger.warning("Error sending initial WS packet: %s", e)

    async def disconnect(self, train_number: str, websocket: WebSocket):
        async with self._lock:
            if train_number in self.active_connections:
                self.active_connections[train_number].discard(websocket)
                if not self.active_connections[train_number]:
                    del self.active_connections[train_number]
                    if train_number in self.active_tasks:
                        self.active_tasks[train_number].cancel()
                        del self.active_tasks[train_number]
        logger.info("Client disconnected from WS for train %s", train_number)

    def _build_packet(self, train_number: str, telemetry: dict) -> dict:
        now = datetime.now(timezone.utc)
        observed_at_str = telemetry.get("observed_at")
        age_seconds = telemetry.get("age_seconds", 0)
        if observed_at_str:
            try:
                obs_dt = datetime.fromisoformat(observed_at_str.replace("Z", "+00:00"))
                age_seconds = int((now - obs_dt).total_seconds())
            except Exception:
                pass

        return {
            "type": "telemetry_update",
            "train_number": train_number,
            "transport": {
                "server_time": now.isoformat(),
                "heartbeat_interval_ms": 5000,
            },
            "telemetry": {
                **telemetry,
                "current_age_seconds": max(0, age_seconds),
            },
        }

    async def _train_broadcaster(self, train_number: str):
        """Background loop reading from Redis/Memory PubSub and emitting periodic heartbeats."""
        sub_queue = await cache.subscribe_channel(f"train_telemetry:{train_number}")
        try:
            while True:
                # Wait for pubsub message or timeout every 5 seconds for heartbeat
                try:
                    raw_msg = None
                    if hasattr(sub_queue, "get_message"):
                        # Redis pubsub
                        msg = await sub_queue.get_message(ignore_subscribe_messages=True, timeout=5.0)
                        if msg and msg.get("data"):
                            raw_msg = msg["data"]
                    else:
                        # Memory queue
                        raw_msg = await asyncio.wait_for(sub_queue.get(), timeout=5.0)

                    telemetry_data = json.loads(raw_msg) if raw_msg else None
                except asyncio.TimeoutError:
                    # 5-second transport heartbeat tick
                    status = await orchestrator.get_live_status(train_number)
                    telemetry_data = status.model_dump(mode="json") if status else None
                except Exception as e:
                    logger.debug("Broadcaster message error: %s", e)
                    telemetry_data = None

                if telemetry_data:
                    packet = self._build_packet(train_number, telemetry_data)
                    dead_clients = []
                    async with self._lock:
                        clients = list(self.active_connections.get(train_number, []))

                    for ws in clients:
                        try:
                            await ws.send_text(json.dumps(packet))
                        except Exception:
                            dead_clients.append(ws)

                    for ws in dead_clients:
                        await self.disconnect(train_number, ws)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error("Fatal error in WS broadcaster for %s: %s", train_number, e)


ws_hub = WebSocketHub()
