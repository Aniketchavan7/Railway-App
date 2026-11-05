import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Optional, Set
from fastapi import WebSocket
from app.cache.redis_client import cache
from app.services.orchestrator import orchestrator

logger = logging.getLogger("railpulse.services.websocket_hub")

HEARTBEAT_SECONDS = 5.0


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

            # Start the broadcaster if there is none, or if the last one died.
            existing = self.active_tasks.get(train_number)
            if existing is None or existing.done():
                task = asyncio.create_task(self._train_broadcaster(train_number))
                self.active_tasks[train_number] = task

        logger.info("Client connected to WS for train %s (total: %d)", train_number, len(self.active_connections[train_number]))

        # Send initial status immediately upon connection
        telemetry = await self._current_telemetry(train_number)
        if telemetry:
            try:
                await websocket.send_text(json.dumps(self._build_packet(train_number, telemetry)))
            except Exception as e:
                logger.warning("Error sending initial WS packet: %s", e)

    async def _current_telemetry(self, train_number: str) -> Optional[dict]:
        try:
            status = await orchestrator.get_live_status(train_number)
        except Exception as e:
            logger.warning("Could not read status for train %s: %s", train_number, e)
            return None
        return status.model_dump(mode="json") if status else None

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

    async def _next_message(self, sub_queue) -> Optional[str]:
        try:
            if hasattr(sub_queue, "get_message"):
                started = time.monotonic()
                msg = await sub_queue.get_message(ignore_subscribe_messages=True, timeout=HEARTBEAT_SECONDS)
                if msg and msg.get("data"):
                    return msg["data"]
                # Hold the tick rate even if Redis returns early, so this cannot spin.
                remaining = HEARTBEAT_SECONDS - (time.monotonic() - started)
                if remaining > 0:
                    await asyncio.sleep(remaining)
                return None
            return await asyncio.wait_for(sub_queue.get(), timeout=HEARTBEAT_SECONDS)
        except asyncio.TimeoutError:
            return None
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.debug("Broadcaster message error: %s", e)
            # Avoid a tight loop if the subscription has broken.
            await asyncio.sleep(HEARTBEAT_SECONDS)
            return None

    async def _train_broadcaster(self, train_number: str):
        """Background loop reading from Redis/Memory PubSub and emitting periodic heartbeats."""
        channel = f"train_telemetry:{train_number}"
        sub_queue = None
        try:
            sub_queue = await cache.subscribe_channel(channel)
            while True:
                raw_msg = await self._next_message(sub_queue)
                # No message within 5 seconds is the heartbeat tick. Redis reports that by
                # returning None and the memory queue by timing out; both must refresh.
                if raw_msg:
                    try:
                        telemetry_data = json.loads(raw_msg)
                    except ValueError:
                        telemetry_data = None
                else:
                    telemetry_data = await self._current_telemetry(train_number)

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
        finally:
            # Otherwise every viewer who leaves costs a Redis connection or a growing queue.
            if sub_queue is not None:
                try:
                    await asyncio.shield(cache.unsubscribe_channel(channel, sub_queue))
                except Exception as e:
                    logger.debug("Could not close subscription for %s: %s", train_number, e)


ws_hub = WebSocketHub()
