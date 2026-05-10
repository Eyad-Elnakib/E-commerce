import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import SessionLocal
from app.deps import get_db, require_admin
from app.models import MetricsSnapshot, User
from app.schemas import GlobalMetricsResponse, UserMetricsResponse, UserPublic
from app.services.eval_service import run_global_evaluation, run_user_evaluation

router = APIRouter(prefix="/api/admin", tags=["metrics", "admin"])

@router.get("/users", response_model=list[UserPublic])
def search_users(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Search users by username or email for admin panel."""
    query = db.query(User)
    if q:
        query = query.filter((User.username.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")))
    return query.limit(20).all()

@router.post("/metrics/recompute", status_code=200)
def recompute_metrics(
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Synchronously recompute metrics and store a snapshot."""
    # We pass include_synthetic=False for the default snapshot, but let's just compute both or wait, the prompt says
    # "eval service filters synthetic rows accordingly".
    # For now, let's just save one snapshot. Or actually, the prompt says:
    # "GET /api/admin/metrics/global returns the latest snapshot's payload_json."
    # "Accepts ?include_synthetic=false|true; eval service filters synthetic rows accordingly."
    # Wait, if GET accepts the flag, does it run the evaluation live or does it read the snapshot?
    # "GET /api/admin/metrics/global returns the latest snapshot's payload_json."
    # If the snapshot doesn't have synthetic data separated, how does the toggle work?
    # Maybe the payload_json contains both, or we compute live if include_synthetic=true?
    # Let's save a payload that contains both, or maybe just evaluate it live if include_synthetic=True,
    # OR the snapshot itself just contains the base evaluation without synthetic. 
    # Let's say the snapshot stores both: {"real_only": {...}, "with_synthetic": {...}}
    
    real_only = run_global_evaluation(include_synthetic=False, db=db)
    with_synthetic = run_global_evaluation(include_synthetic=True, db=db)
    
    payload = {
        "real_only": real_only,
        "with_synthetic": with_synthetic
    }
    
    snapshot = MetricsSnapshot(
        generated_at=datetime.now(timezone.utc),
        payload_json=payload
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    
    return {"status": "ok", "snapshot_id": snapshot.id}


@router.get("/metrics/global", response_model=GlobalMetricsResponse)
def get_global_metrics(
    include_synthetic: bool = Query(False),
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Return the latest metrics snapshot."""
    snapshot = db.query(MetricsSnapshot).order_by(MetricsSnapshot.generated_at.desc()).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No metrics yet")
        
    payload = snapshot.payload_json
    # Handle legacy payload if any, or the new dual payload
    if "real_only" in payload:
        data = payload["with_synthetic"] if include_synthetic else payload["real_only"]
    else:
        # Fallback if old snapshot
        data = payload
        
    return GlobalMetricsResponse(
        generated_at=snapshot.generated_at,
        methods=data["methods"]
    )


@router.get("/metrics/user/{user_id}", response_model=UserMetricsResponse)
def get_user_metrics(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Return per-user metrics and recommendations."""
    result = run_user_evaluation(user_id=user_id, db=db)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
        
    return result


@router.get("/metrics/user/{user_id}/stats")
def get_user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Return enriched user statistics for the admin dashboard."""
    from app.models import Rating, Favourite, Order, Product
    from collections import Counter

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ── Rating Distribution (1-5 star counts) ──
    ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    dist = Counter(r.value for r in ratings)
    rating_distribution = {str(i): dist.get(i, 0) for i in range(1, 6)}

    # ── Average rating ──
    avg_rating = round(sum(r.value for r in ratings) / len(ratings), 2) if ratings else 0.0

    # ── Top Categories (from ratings + favourites) ──
    rated_product_ids = [r.product_id for r in ratings if r.value >= 4]
    fav_product_ids = [f.product_id for f in db.query(Favourite).filter(Favourite.user_id == user_id).all()]
    all_liked_ids = set(rated_product_ids + fav_product_ids)

    cat_counter = Counter()
    if all_liked_ids:
        liked_products = db.query(Product.category).filter(Product.id.in_(all_liked_ids)).all()
        for (cat,) in liked_products:
            if cat:
                cat_counter[cat] += 1

    top_categories = [{"category": cat, "count": count} for cat, count in cat_counter.most_common(6)]

    # ── Counts ──
    total_ratings = len(ratings)
    total_favourites = db.query(func.count(Favourite.product_id)).filter(Favourite.user_id == user_id).scalar() or 0
    total_orders = db.query(func.count(Order.id)).filter(Order.user_id == user_id).scalar() or 0

    # ── Method Overlap Analysis ──
    from app.services.rec_engine import RecommendationEngine
    engine = RecommendationEngine()
    engine._ensure_fitted(db)

    method_names = ["User-Based KNN", "Item-Based Cosine CF", "SVD", "Content-Based"]
    method_recs = {}
    for method in method_names:
        try:
            recs = engine.get_recommendations_by_method(method, user_id, 10, db)
            method_recs[method] = set(recs)
        except Exception:
            method_recs[method] = set()

    overlap_matrix = []
    for m1 in method_names:
        row = {}
        for m2 in method_names:
            s1 = method_recs.get(m1, set())
            s2 = method_recs.get(m2, set())
            if len(s1) == 0 and len(s2) == 0:
                row[m2] = 0
            elif len(s1 | s2) == 0:
                row[m2] = 0
            else:
                row[m2] = round(len(s1 & s2) / max(len(s1 | s2), 1), 2)
        overlap_matrix.append({"method": m1, **row})

    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else "",
        },
        "total_ratings": total_ratings,
        "total_favourites": total_favourites,
        "total_orders": total_orders,
        "avg_rating": avg_rating,
        "rating_distribution": rating_distribution,
        "top_categories": top_categories,
        "overlap_matrix": overlap_matrix,
    }

