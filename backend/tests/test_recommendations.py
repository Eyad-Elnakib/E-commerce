import time
import pytest
from httpx import AsyncClient

from app.cache import cache
from app.services.event_bus import event_bus
from app.models import Product

@pytest.fixture(autouse=True)
def clear_cache():
    cache._store.clear()
    # Reset event bus just in case
    yield
    cache._store.clear()

@pytest.mark.asyncio
async def test_feed_cache_hit_miss(client: AsyncClient, auth_headers):
    # Miss
    response = await client.get("/api/recommendations/feed?limit=5", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["from_cache"] is False
    assert len(data["rows"]) > 0

    # Hit
    start_time = time.perf_counter()
    response2 = await client.get("/api/recommendations/feed?limit=5", headers=auth_headers)
    elapsed = time.perf_counter() - start_time
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["from_cache"] is True
    assert elapsed < 0.05  # Should be very fast

@pytest.mark.asyncio
async def test_feed_unauthenticated(client: AsyncClient):
    response = await client.get("/api/recommendations/feed?limit=5")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_cache_invalidation_events(db_session, auth_headers):
    user_id = 1
    cache_key = f"rec:user:{user_id}:feed:limit:10"
    
    # Preload cache
    cache.set(cache_key, {"rows": []})
    assert cache.get(cache_key) is not None

    # Trigger event
    event_bus.publish("favourite.added", user_id=user_id)
    assert cache.get(cache_key) is None

    # Test isolated to user
    cache.set(cache_key, {"rows": []})
    event_bus.publish("favourite.added", user_id=2)
    assert cache.get(cache_key) is not None

@pytest.mark.asyncio
async def test_dismiss_recommendation(client: AsyncClient, auth_headers, db_session):
    product = db_session.query(Product).first()
    
    cache_key = f"rec:user:1:feed:limit:10"
    cache.set(cache_key, {"rows": []})
    
    response = await client.post(f"/api/recommendations/{product.id}/dismiss", headers=auth_headers)
    assert response.status_code == 204
    
    # Assert cache invalidated
    assert cache.get(cache_key) is None

@pytest.mark.asyncio
async def test_gift_recommendations(client: AsyncClient):
    payload = {
        "recipient": "friend",
        "occasion": "birthday",
        "personality": "geek",
        "budget": "under_50",
        "age_group": "adult"
    }
    
    response = await client.post("/api/recommendations/gift", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "items" in data
    assert len(data["items"]) <= 6
    if len(data["items"]) > 0:
        item = data["items"][0]
        assert "product" in item
        assert "match_percent" in item
        assert "explanation" in item

@pytest.mark.asyncio
async def test_gift_rate_limit(client: AsyncClient):
    payload = {
        "recipient": "friend",
        "occasion": "birthday",
        "personality": "geek",
        "budget": "under_50",
        "age_group": "adult"
    }
    
    # Flood to hit rate limit
    for _ in range(60):
        await client.post("/api/recommendations/gift", json=payload)
        
    response = await client.post("/api/recommendations/gift", json=payload)
    assert response.status_code == 429
