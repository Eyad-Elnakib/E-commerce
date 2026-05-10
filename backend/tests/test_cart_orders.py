"""
Tests for Cart and Orders (Group C1-C3)
"""
import pytest
from httpx import AsyncClient

from app.models import CartItem, Order, Product

@pytest.mark.asyncio
class TestCartAndOrders:
    async def test_add_to_cart_success(self, client: AsyncClient, auth_headers: dict, db_session):
        # Add item to cart
        resp = await client.post("/api/cart", headers=auth_headers, json={
            "product_id": 1,
            "quantity": 2
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["product_id"] == 1
        assert data["quantity"] == 2
        assert "price_at_add" in data

    async def test_add_to_cart_stock_limit(self, client: AsyncClient, auth_headers: dict, db_session):
        # Fetch product 1 to know its current stock
        prod_resp = await client.get("/api/products/1")
        current_stock = prod_resp.json()["stock"]

        # Try to add more than available stock
        resp = await client.post("/api/cart", headers=auth_headers, json={
            "product_id": 1,
            "quantity": current_stock + 1
        })
        assert resp.status_code == 400
        assert "Not enough stock" in resp.json()["detail"]

    async def test_update_cart_quantity(self, client: AsyncClient, auth_headers: dict, db_session):
        # First ensure item is in cart
        await client.post("/api/cart", headers=auth_headers, json={"product_id": 2, "quantity": 1})
        
        # Get cart to find item ID
        cart_resp = await client.get("/api/cart", headers=auth_headers)
        item_id = [item["id"] for item in cart_resp.json() if item["product_id"] == 2][0]

        # Update quantity
        resp = await client.put(f"/api/cart/{item_id}", headers=auth_headers, json={
            "quantity": 3
        })
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 3

    async def test_update_cart_to_zero_removes(self, client: AsyncClient, auth_headers: dict, db_session):
        cart_resp = await client.get("/api/cart", headers=auth_headers)
        item_id = cart_resp.json()[0]["id"]

        resp = await client.put(f"/api/cart/{item_id}", headers=auth_headers, json={
            "quantity": 0
        })
        assert resp.status_code == 204

        cart_resp_after = await client.get("/api/cart", headers=auth_headers)
        assert item_id not in [item["id"] for item in cart_resp_after.json()]

    async def test_create_order(self, client: AsyncClient, auth_headers: dict, db_session):
        # Ensure cart is not empty
        await client.post("/api/cart", headers=auth_headers, json={"product_id": 1, "quantity": 1})
        
        # Check initial stock
        prod_resp = await client.get("/api/products/1")
        initial_stock = prod_resp.json()["stock"]

        # Create order
        resp = await client.post("/api/orders", headers=auth_headers, json={
            "payment_method": "card"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "confirmed"
        assert data["total"] > 0

        # Check cart is empty
        cart_resp = await client.get("/api/cart", headers=auth_headers)
        assert len(cart_resp.json()) == 0

        # Check stock is decremented
        prod_resp_after = await client.get("/api/products/1")
        assert prod_resp_after.json()["stock"] == initial_stock - 1

    async def test_idempotent_order(self, client: AsyncClient, auth_headers: dict, db_session):
        # Add to cart
        await client.post("/api/cart", headers=auth_headers, json={"product_id": 2, "quantity": 1})
        
        key = "idem-key-123"
        headers = {**auth_headers, "Idempotency-Key": key}

        # Create order 1
        resp1 = await client.post("/api/orders", headers=headers, json={"payment_method": "cod"})
        assert resp1.status_code == 201
        order_id = resp1.json()["id"]

        # Cart is now empty, if we try without key it fails
        resp_fail = await client.post("/api/orders", headers=auth_headers, json={"payment_method": "cod"})
        assert resp_fail.status_code == 400

        # Try with same key -> should return existing order
        resp2 = await client.post("/api/orders", headers=headers, json={"payment_method": "cod"})
        assert resp2.status_code == 201 # Actually the API returns 201 for the cached response too
        assert resp2.json()["id"] == order_id
