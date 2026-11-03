import asyncio
import json
import logging
import time
from typing import Any, Callable, Dict, List, Optional
from app.config import settings

logger = logging.getLogger("railpulse.cache")


class MemoryCache:
    """In-memory fallback cache with TTL support and Pub/Sub."""
    def __init__(self):
        self._store: Dict[str, tuple[Any, float]] = {}
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            if key not in self._store:
                return None
            val, expiry = self._store[key]
            if expiry and time.time() > expiry:
                del self._store[key]
                return None
            return val

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        async with self._lock:
            expiry = time.time() + ex if ex else None
            self._store[key] = (value, expiry)
            return True

    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    async def publish(self, channel: str, message: str) -> int:
        async with self._lock:
            queues = self._subscribers.get(channel, [])
            count = 0
            for q in queues:
                await q.put(message)
                count += 1
            return count

    async def subscribe(self, channel: str) -> asyncio.Queue:
        async with self._lock:
            if channel not in self._subscribers:
                self._subscribers[channel] = []
            q: asyncio.Queue = asyncio.Queue()
            self._subscribers[channel].append(q)
            return q

    async def unsubscribe(self, channel: str, q: asyncio.Queue):
        async with self._lock:
            if channel in self._subscribers and q in self._subscribers[channel]:
                self._subscribers[channel].remove(q)


class CacheManager:
    def __init__(self):
        self._redis = None
        self._memory = MemoryCache()
        self.is_redis_active = False

    async def initialize(self):
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
                await self._redis.ping()
                self.is_redis_active = True
                logger.info("Connected to Redis cache: %s", settings.REDIS_URL)
            except Exception as e:
                logger.warning("Redis connection failed (%s), using in-memory TTL fallback.", e)
                self._redis = None
                self.is_redis_active = False
        else:
            logger.info("No REDIS_URL provided. Using in-memory TTL cache fallback.")

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        try:
            if self.is_redis_active and self._redis:
                raw = await self._redis.get(key)
            else:
                raw = await self._memory.get(key)
            return json.loads(raw) if raw else None
        except Exception as e:
            logger.error("Cache get error for key %s: %s", key, e)
            return None

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 60) -> bool:
        try:
            raw = json.dumps(value, default=str)
            if self.is_redis_active and self._redis:
                return await self._redis.set(key, raw, ex=ttl_seconds)
            else:
                return await self._memory.set(key, raw, ex=ttl_seconds)
        except Exception as e:
            logger.error("Cache set error for key %s: %s", key, e)
            return False

    async def publish_event(self, channel: str, data: Any) -> int:
        raw = json.dumps(data, default=str)
        if self.is_redis_active and self._redis:
            try:
                return await self._redis.publish(channel, raw)
            except Exception as e:
                logger.warning("Redis publish error (%s), fallback to memory", e)
        return await self._memory.publish(channel, raw)

    async def subscribe_channel(self, channel: str):
        if self.is_redis_active and self._redis:
            try:
                pubsub = self._redis.pubsub()
                await pubsub.subscribe(channel)
                return pubsub
            except Exception:
                pass
        return await self._memory.subscribe(channel)

    async def close(self):
        if self._redis:
            await self._redis.close()


cache = CacheManager()
