import pytest
from httpx import AsyncClient

from app.models import MetricsSnapshot

@pytest.mark.asyncio
async def test_recompute_metrics_admin(client: AsyncClient, admin_headers, db_session):
    resp = await client.post("/api/admin/metrics/recompute", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "snapshot_id" in data
    
    # Check if saved to DB
    snapshot = db_session.query(MetricsSnapshot).filter(MetricsSnapshot.id == data["snapshot_id"]).first()
    assert snapshot is not None

@pytest.mark.asyncio
async def test_metrics_non_admin(client: AsyncClient, auth_headers):
    resp = await client.post("/api/admin/metrics/recompute", headers=auth_headers)
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_get_global_metrics(client: AsyncClient, admin_headers):
    # Ensure there's a snapshot
    await client.post("/api/admin/metrics/recompute", headers=admin_headers)
    
    resp = await client.get("/api/admin/metrics/global?include_synthetic=false", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "generated_at" in data
    assert "methods" in data
    assert len(data["methods"]) > 0

@pytest.mark.asyncio
async def test_get_user_metrics(client: AsyncClient, admin_headers):
    resp = await client.get("/api/admin/metrics/user/1", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "user" in data
    assert data["user"]["id"] == 1
    assert "methods" in data
    assert len(data["methods"]) > 0
    assert "list" in data["methods"][0]

@pytest.mark.asyncio
async def test_search_users(client: AsyncClient, admin_headers):
    resp = await client.get("/api/admin/users?q=admin", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
