"""
Tests for Group B — Admin & Products
B1: Admin Product Management
B2: Product Browsing
B3: Product Details & Caching
"""
import pytest
from httpx import AsyncClient

from app.models import Product
from app.routers.products import product_cache
from app.services.event_bus import event_bus

@pytest.mark.asyncio
class TestB1AdminProductManagement:
    async def test_require_admin_role_403(self, client: AsyncClient, auth_headers: dict):
        """Normal user gets 403 when trying to access admin endpoints."""
        resp = await client.post("/api/admin/products", headers=auth_headers, json={
            "name": "Hacker Item", "price": 10.0, "stock": 5
        })
        assert resp.status_code == 403

    async def test_admin_create_product_201(self, client: AsyncClient, admin_headers: dict):
        """Admin can create a product."""
        resp = await client.post("/api/admin/products", headers=admin_headers, json={
            "name": "Admin Item",
            "category": "Electronics",
            "price": 199.99,
            "stock": 10,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Admin Item"
        assert data["id"] is not None

    async def test_admin_soft_delete(self, client: AsyncClient, admin_headers: dict, db_session):
        """Admin can soft-delete a product, verifying it is hidden from listings."""
        # Create a product
        resp = await client.post("/api/admin/products", headers=admin_headers, json={
            "name": "Delete Me",
            "price": 5.0,
            "stock": 1,
        })
        prod_id = resp.json()["id"]

        # Soft delete
        del_resp = await client.delete(f"/api/admin/products/{prod_id}", headers=admin_headers)
        assert del_resp.status_code == 204

        # Verify DB deleted_at is set
        product = db_session.query(Product).filter(Product.id == prod_id).first()
        assert product.deleted_at is not None

        # Verify it doesn't show up in browsing (B2)
        browse_resp = await client.get("/api/products")
        data = browse_resp.json()["data"]
        assert not any(p["id"] == prod_id for p in data)

        # Verify it returns 404 on direct fetch (B3)
        get_resp = await client.get(f"/api/products/{prod_id}")
        assert get_resp.status_code == 404

@pytest.mark.asyncio
class TestB2ProductBrowsing:
    async def test_pagination(self, client: AsyncClient):
        """Verify pagination meta and limits."""
        resp = await client.get("/api/products?page=1&page_size=5")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 5
        assert data["meta"]["page"] == 1
        assert data["meta"]["page_size"] == 5
        assert data["meta"]["total"] >= 20  # seeded 20 initially

    async def test_category_filtering(self, client: AsyncClient):
        """Verify category filtering."""
        resp = await client.get("/api/products?category=Books")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) > 0
        assert all(p["category"] == "Books" for p in data)

@pytest.mark.asyncio
class TestB3ProductCaching:
    async def test_cache_hit_and_invalidation(self, client: AsyncClient, admin_headers: dict, db_session):
        """
        Verify:
        1. Fetching product populates TTLCache.
        2. Next fetch is a cache hit.
        3. Admin update invalidates cache via EventBus.
        4. Next fetch hits DB and returns updated data.
        """
        # Clear cache and events for clean state
        product_cache.invalidate_prefix("")

        # 1. First fetch (miss -> hits DB -> sets cache)
        resp1 = await client.get("/api/products/1")
        assert resp1.status_code == 200
        assert product_cache.get("product:1") is not None

        # 2. Modify DB behind the scenes directly to test cache hit
        # If we hit the cache, we WON'T see the DB change yet
        # (This simulates a raw DB update bypassing the app)
        p = db_session.query(Product).filter(Product.id == 1).first()
        original_name = p.name
        p.name = "Sneaky DB Update"
        db_session.commit()

        # Fetch again -> should be cache hit -> old name
        resp2 = await client.get("/api/products/1")
        assert resp2.json()["name"] == original_name

        # 3. Admin update -> Should update DB and invalidate cache via EventBus
        resp3 = await client.put("/api/admin/products/1", headers=admin_headers, json={
            "name": "Proper Admin Update",
            "price": 10.0
        })
        assert resp3.status_code == 200
        assert product_cache.get("product:1") is None

        # 4. Fetch again -> Cache missed -> fetches from DB
        resp4 = await client.get("/api/products/1")
        assert resp4.json()["name"] == "Proper Admin Update"
