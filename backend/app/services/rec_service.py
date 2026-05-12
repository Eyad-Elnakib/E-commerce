"""
Recommendation service — thin wrapper around RecommendationEngine.
Called by routers/recommendations.py (function signatures unchanged).
"""
from typing import Any
from sqlalchemy.orm import Session
from app.models import Product, Rating
from app.services.rec_engine import rec_engine


def get_grouped_feed_recommendations(user_id: int, limit: int, db: Session) -> list[dict]:
    """
    Return 7 distinct recommendation rows using all methods.
    """
    methods = [
        ("Top Picks for You", "hybrid"),
        ("Popular Right Now", "popularity"),
        ("Similar Users Liked", "user_knn"),
        ("Because You Liked", "item_cosine"),
        ("Discover Your Taste", "euclidean"),
        ("Hidden Patterns (AI)", "svd"),
        ("Content Similarities", "content")
    ]
    
    method_results = []
    all_pids_set = set()
    
    for display_name, method_key in methods:
        if method_key == "hybrid":
            pids = rec_engine.hybrid_feed(user_id, limit, db)
        else:
            pids = rec_engine.get_recommendations_by_method(method_key, user_id, limit, db)
            
        if not pids and method_key != "popularity":
            # Smart Fallback for Cold-Start: Filter popularity by user's favorite categories
            fav_cats = db.query(Product.category).join(Rating).filter(
                Rating.user_id == user_id, Rating.value >= 4
            ).distinct().all()
            fav_cats = [c[0] for c in fav_cats if c[0]]
            
            if fav_cats:
                # Get popular items in these categories
                pids = db.query(Product.id).filter(
                    Product.category.in_(fav_cats),
                    Product.deleted_at == None
                ).limit(limit).all()
                pids = [p[0] for p in pids]
            
            # Final fallback to global popularity if still empty
            if not pids:
                pids = rec_engine.popularity_baseline(limit)
            
        all_pids_set.update(pids)
        method_results.append({
            "method_name": display_name,
            "product_ids": pids
        })
        
    products_map = {}
    if all_pids_set:
        products = db.query(Product).filter(
            Product.id.in_(list(all_pids_set)),
            Product.deleted_at == None
        ).all()
        for p in products:
            products_map[p.id] = p
            
    final_groups = []
    for m in method_results:
        group_products = [products_map[pid] for pid in m["product_ids"] if pid in products_map]
        if group_products:
            final_groups.append({
                "method_name": m["method_name"],
                "products": group_products
            })
            
    return final_groups


def gift_recommendations(req: Any, db: Session) -> list[dict]:
    """
    Knowledge-Based Gift Finder with real tag scoring.
    Returns top 6 products with match_percent and explanation.
    """
    return rec_engine.gift_score(req, db)
