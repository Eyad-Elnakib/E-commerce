"""
FastAPI app instance, mounts all routers, mounts /static.
"""
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routers import auth, products, admin, favourites, events, recommendations, cart, orders, metrics, admin_simulate
from app.services.event_bus import event_bus
from app.cache import cache
from app.services.rec_engine import rec_engine

def invalidate_user_feed(user_id: int, **kwargs):
    cache.invalidate_prefix(f"rec:user:{user_id}")

def invalidate_rec_engine(**kwargs):
    """Invalidate recommendation engine matrices when data changes."""
    rec_engine.invalidate()

event_bus.subscribe("favourite.added", invalidate_user_feed)
event_bus.subscribe("favourite.removed", invalidate_user_feed)
event_bus.subscribe("rating.created", invalidate_user_feed)
event_bus.subscribe("order.placed", invalidate_user_feed)
event_bus.subscribe("rec.dismissed", invalidate_user_feed)

# Also invalidate the ML engine when data changes
event_bus.subscribe("favourite.added", invalidate_rec_engine)
event_bus.subscribe("favourite.removed", invalidate_rec_engine)
event_bus.subscribe("rating.created", invalidate_rec_engine)
event_bus.subscribe("product.created", invalidate_rec_engine)
event_bus.subscribe("product.updated", invalidate_rec_engine)
event_bus.subscribe("product.deleted", invalidate_rec_engine)
event_bus.subscribe("product.restored", invalidate_rec_engine)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

app = FastAPI(
    title="Intelligent E-Commerce Recommendation System",
    version="1.0.0",
    description="University project — localhost scope only",
)

# ── CORS ────────────────────────────────────────────────
import os
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",           # local dev
    "http://localhost:3000",           # alternate local dev
]

# In production, add your Vercel URL
vercel_url = os.getenv("FRONTEND_URL")
if vercel_url:
    origins.append(vercel_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ────────────────────────────────────────────────────────

# Mount static files for product images
data_dir = Path(__file__).parent.parent / "data"
data_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(data_dir)), name="static")

# Mount routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(admin.router)
app.include_router(admin_simulate.router)
app.include_router(favourites.router)
app.include_router(events.router)
app.include_router(recommendations.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(metrics.router)
from app.routers import ratings
app.include_router(ratings.router)


@app.get("/api/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}
