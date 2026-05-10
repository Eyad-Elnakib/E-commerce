"""
Tests for Group C — Favourites & Recommendation Stubs
C1: Favourites (Heart)
C2: Event Telemetry Stub
C3: Recommendation Stub
"""
import pytest
from httpx import AsyncClient

from app.models import Event, Favourite, Product

@pytest.mark.asyncio
class TestC1Favourites:
    async def test_add_remove_favourite(self, client: AsyncClient, auth_headers: dict, db_session):
        # Add favourite
        resp1 = await client.post("/api/favourites/1", headers=auth_headers)
        assert resp1.status_code == 201

        # Idempotent add
        resp2 = await client.post("/api/favourites/1", headers=auth_headers)
        assert resp2.status_code == 201

        # Check product response
        prod_resp = await client.get("/api/products/1", headers=auth_headers)
        assert prod_resp.json()["is_favourited"] is True

        # Remove favourite
        resp3 = await client.delete("/api/favourites/1", headers=auth_headers)
        assert resp3.status_code == 204

        # Idempotent remove
        resp4 = await client.delete("/api/favourites/1", headers=auth_headers)
        assert resp4.status_code == 204

        # Check product response again
        prod_resp2 = await client.get("/api/products/1", headers=auth_headers)
        assert prod_resp2.json()["is_favourited"] is False

    async def test_favourite_soft_deleted(self, client: AsyncClient, admin_headers: dict, auth_headers: dict, db_session):
        # Create a product to soft delete
        prod = await client.post("/api/admin/products", headers=admin_headers, json={
            "name": "Delete Me For Fav", "price": 10.0, "stock": 1
        })
        pid = prod.json()["id"]

        # Soft delete it
        await client.delete(f"/api/admin/products/{pid}", headers=admin_headers)

        # Favouriting it should still work according to constraints
        fav_resp = await client.post(f"/api/favourites/{pid}", headers=auth_headers)
        assert fav_resp.status_code == 201

@pytest.mark.asyncio
class TestC2EventTelemetry:
    async def test_anonymous_events(self, client: AsyncClient, db_session):
        initial_count = db_session.query(Event).count()

        resp = await client.post("/api/events", json={
            "events": [
                {"event_type": "view", "product_id": 1, "session_id": "anon-123"}
            ]
        })
        assert resp.status_code == 200
        
        final_count = db_session.query(Event).count()
        assert final_count == initial_count + 1

        event = db_session.query(Event).order_by(Event.id.desc()).first()
        assert event.user_id is None
        assert event.session_id == "anon-123"

    async def test_authenticated_batch(self, client: AsyncClient, auth_headers: dict, db_session):
        resp = await client.post("/api/events", headers=auth_headers, json={
            "events": [
                {"event_type": "view", "product_id": 1},
                {"event_type": "click", "product_id": 2},
                {"event_type": "favourite", "product_id": 1}
            ]
        })
        assert resp.status_code == 200

        events = db_session.query(Event).order_by(Event.id.desc()).limit(3).all()
        # They were just inserted, so they will be at the end. 
        # All of them should have user_id assigned to the seeded user (id=1 for 'user1')
        assert all(e.user_id is not None for e in events)

@pytest.mark.asyncio
class TestC3RecommendationStub:
    async def test_feed_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/recommendations/feed")
        assert resp.status_code == 200
        data = resp.json()
        assert "rows" in data
        assert len(data["rows"]) <= 5
        assert "generated_at" in data
        assert data["from_cache"] is False

    async def test_gift_endpoint(self, client: AsyncClient):
        resp = await client.post("/api/recommendations/gift", json={
            "recipient": "mom",
            "occasion": "birthday",
            "personality": "loves gardening",
            "budget": "under $50",
            "age_group": "50s"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) == 1
        item = data["items"][0]
        assert "product" in item
        assert "explanation" in item
        assert "match_percent" in item
