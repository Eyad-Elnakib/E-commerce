import pytest
from httpx import AsyncClient
from datetime import datetime, timezone

from app.models import Product, User, Order, ProductRating

@pytest.mark.asyncio
async def test_admin_role_guard(client: AsyncClient, auth_headers):
    # Non-admin user tries to access /api/admin/products
    resp = await client.get("/api/admin/products", headers=auth_headers)
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_admin_crud(client: AsyncClient, admin_headers, db_session):
    # CREATE
    create_payload = {
        "name": "Admin Test Product",
        "category": "Test",
        "brand": "AdminBrand",
        "price": 19.99,
        "description": "Test description",
        "stock": 100
    }
    resp = await client.post("/api/admin/products", json=create_payload, headers=admin_headers)
    assert resp.status_code == 201
    product_id = resp.json()["id"]

    # UPDATE
    update_payload = {"price": 29.99}
    resp = await client.patch(f"/api/admin/products/{product_id}", json=update_payload, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["price"] == 29.99

    # DELETE
    resp = await client.delete(f"/api/admin/products/{product_id}", headers=admin_headers)
    assert resp.status_code == 204

    # Verify soft delete
    db_session.expire_all()
    product = db_session.query(Product).filter(Product.id == product_id).first()
    assert product.deleted_at is not None

    # GET without include_deleted=true
    resp = await client.get("/api/admin/products", headers=admin_headers)
    assert resp.status_code == 200
    product_ids = [p["id"] for p in resp.json()]
    assert product_id not in product_ids

    # GET with include_deleted=true
    resp = await client.get("/api/admin/products?include_deleted=true", headers=admin_headers)
    assert resp.status_code == 200
    product_ids_all = [p["id"] for p in resp.json()]
    assert product_id in product_ids_all

    # RESTORE
    resp = await client.post(f"/api/admin/products/{product_id}/restore", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["deleted_at"] is None

@pytest.mark.asyncio
async def test_admin_simulation(client: AsyncClient, admin_headers, db_session):
    test_user = db_session.query(User).filter(User.username == "user1").first()
    test_product = db_session.query(Product).first()

    payload = {
        "user_id": test_user.id,
        "actions": [
            {"type": "rating", "product_id": test_product.id, "value": 5},
            {"type": "purchase", "product_id": test_product.id}
        ]
    }
    
    resp = await client.post("/api/admin/simulate", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["inserted"]["ratings"] == 1
    assert data["inserted"]["orders"] == 1

    # Verify DB
    db_session.expire_all()
    rating = db_session.query(ProductRating).filter(ProductRating.user_id == test_user.id, ProductRating.product_id == test_product.id).first()
    assert rating is not None
    assert rating.is_synthetic is True

    order = db_session.query(Order).filter(Order.user_id == test_user.id).first()
    assert order is not None
    assert order.is_synthetic is True

@pytest.mark.asyncio
async def test_admin_simulation_validation(client: AsyncClient, admin_headers, db_session):
    test_user = db_session.query(User).filter(User.username == "user1").first()

    # Invalid user
    payload = {
        "user_id": 99999,
        "actions": [
            {"type": "purchase", "product_id": 1}
        ]
    }
    resp = await client.post("/api/admin/simulate", json=payload, headers=admin_headers)
    assert resp.status_code == 404

    # Invalid product
    payload = {
        "user_id": test_user.id,
        "actions": [
            {"type": "purchase", "product_id": 99999}
        ]
    }
    resp = await client.post("/api/admin/simulate", json=payload, headers=admin_headers)
    assert resp.status_code == 400

    # Invalid rating value
    payload = {
        "user_id": test_user.id,
        "actions": [
            {"type": "rating", "product_id": 1, "value": 6}
        ]
    }
    resp = await client.post("/api/admin/simulate", json=payload, headers=admin_headers)
    assert resp.status_code == 422
