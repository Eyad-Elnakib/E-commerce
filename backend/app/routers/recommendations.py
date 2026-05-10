import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.deps import get_db, get_optional_user, get_current_user
from app.models import Product, RecommendationDismissal
from app.schemas import FeedResponse, GiftRequest, GiftResponse, ProductResponse, RecommendationItem
from app.routers.products import annotate_product_with_user_state
from app.services.rec_service import get_grouped_feed_recommendations, gift_recommendations
from app.services.event_bus import event_bus
from app.cache import cache

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])
logger = logging.getLogger(__name__)

@router.get("/feed", response_model=FeedResponse)
async def get_feed(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Return the user's recommendation rows, using an in-memory cache."""
    cache_key = f"rec:user:{current_user.id}:feed:grouped:limit:{limit}"
    
    cached_response = cache.get(cache_key)
    if cached_response is not None:
        return cached_response
        
    logger.info(f"Cache miss for {cache_key}. Recomputing recommendations.")
    
    # Run CPU-bound recommendation algorithm in a threadpool
    grouped_products = await run_in_threadpool(
        get_grouped_feed_recommendations, current_user.id, limit, db
    )
    
    groups = []
    for group in grouped_products:
        row_items = []
        for p in group["products"]:
            p_resp = ProductResponse.model_validate(p)
            p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)
            row_items.append(p_resp.model_dump())
        
        groups.append({
            "method_name": group["method_name"],
            "products": row_items
        })

    response = FeedResponse(
        groups=groups,
        generated_at=datetime.now(timezone.utc),
        from_cache=False
    )
    
    cached_obj = FeedResponse(
        groups=groups,
        generated_at=response.generated_at,
        from_cache=True
    )
    cache.set(cache_key, cached_obj)
    
    return response

@router.post("/gift", response_model=GiftResponse)
async def get_gift_recommendation(
    req: GiftRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """Return a gift recommendation based on input, wrapping the KB engine."""
    # Simple IP-based throttle
    client_ip = request.client.host if request.client else "unknown"
    throttle_key = f"throttle:gift:{client_ip}"
    
    # Count requests using cache as a simple store
    count = cache.get(throttle_key) or 0
    if count >= 60:
        raise HTTPException(status_code=429, detail="Too many requests")
    cache.set(throttle_key, count + 1, ttl=60)
    
    # Run the KB engine in a threadpool
    rec_items = await run_in_threadpool(
        gift_recommendations, req, db
    )
    
    items = []
    for item in rec_items:
        p_resp = ProductResponse.model_validate(item["product"])
        if current_user:
            p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)
            
        items.append(RecommendationItem(
            product=p_resp,
            match_percent=item["match_percent"],
            explanation=item["explanation"]
        ))
    
    return GiftResponse(items=items)


@router.post("/{product_id}/dismiss", status_code=204)
def dismiss_recommendation(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Dismiss a recommendation."""
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    dismissal = RecommendationDismissal(
        user_id=current_user.id,
        product_id=product_id
    )
    db.merge(dismissal)
    db.commit()
    
    # Invalidate cache
    event_bus.publish("rec.dismissed", user_id=current_user.id, product_id=product_id)
    
    return None
