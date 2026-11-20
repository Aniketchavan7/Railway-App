"""Unit tests for Railway-App in-memory cache and Redis fallback abstraction."""

import asyncio
import time
import pytest
from app.cache.redis_client import MemoryCache


@pytest.mark.asyncio
async def test_memory_cache_basic_set_get():
    """Verify basic key storage and retrieval."""
    cache = MemoryCache()
    await cache.set("train:12002:status", "ON_TIME")
    val = await cache.get("train:12002:status")
    assert val == "ON_TIME"


@pytest.mark.asyncio
async def test_memory_cache_missing_key():
    """Verify missing key returns None."""
    cache = MemoryCache()
    val = await cache.get("nonexistent:key")
    assert val is None


@pytest.mark.asyncio
async def test_memory_cache_delete():
    """Verify key deletion semantics."""
    cache = MemoryCache()
    await cache.set("temp_key", "temporary_value")
    assert await cache.get("temp_key") == "temporary_value"
    deleted = await cache.delete("temp_key")
    assert deleted is True
    assert await cache.get("temp_key") is None
    # Deleting again returns False
    assert await cache.delete("temp_key") is False


@pytest.mark.asyncio
async def test_memory_cache_ttl_expiration():
    """Verify key expiration after TTL."""
    cache = MemoryCache()
    # Set key with 1-second TTL
    await cache.set("fast_expire", "val", ex=1)
    assert await cache.get("fast_expire") == "val"

    # Wait for TTL to elapse
    await asyncio.sleep(1.1)
    assert await cache.get("fast_expire") is None


@pytest.mark.asyncio
async def test_memory_cache_pub_sub():
    """Verify pub/sub broadcast to subscribers."""
    cache = MemoryCache()
    queue = await cache.subscribe("train_updates")
    
    count = await cache.publish("train_updates", '{"train_no": "12002", "delay": 5}')
    assert count == 1

    msg = await asyncio.wait_for(queue.get(), timeout=2.0)
    assert "12002" in msg
