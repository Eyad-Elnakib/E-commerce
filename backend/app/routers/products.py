"""
Products router for browsing and details.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.deps import get_db, get_optional_user
from app.models import Product, Favourite, CartItem
from app.schemas import ProductResponse, ProductListResponse, PaginationMeta
from app.cache import TTLCache
from app.services.event_bus import event_bus

router = APIRouter(prefix="/api/products", tags=["products"])

# In-memory cache for product details
product_cache = TTLCache()

# Subscribe to admin product updates
def invalidate_product_cache(product_id: int):
    product_cache.invalidate_prefix(f"product:{product_id}")

event_bus.subscribe("product_updated", invalidate_product_cache)

def annotate_product_with_user_state(product: ProductResponse, user_id: int, db: Session) -> ProductResponse:
    """Helper to attach is_favourited and is_in_cart for authenticated users."""
    product.is_favourited = db.query(Favourite).filter(
        Favourite.user_id == user_id,
        Favourite.product_id == product.id
    ).first() is not None

    product.is_in_cart = db.query(CartItem).filter(
        CartItem.user_id == user_id,
        CartItem.product_id == product.id
    ).first() is not None

    from app.models import Rating
    user_rate = db.query(Rating).filter(
        Rating.user_id == user_id,
        Rating.product_id == product.id
    ).first()
    if user_rate:
        product.user_rating = user_rate.value

    return product

@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    """List all unique product categories."""
    categories = db.query(Product.category).filter(Product.deleted_at == None).distinct().all()
    # categories is a list of tuples like [('Electronics',), ('Groceries',)]
    return [c[0] for c in categories if c[0]]

@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    brand: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """List products with pagination and filtering. Excludes soft-deleted."""
    query = db.query(Product).filter(Product.deleted_at == None)

    if category:
        query = query.filter(Product.category == category)
    if brand:
        query = query.filter(Product.brand == brand)

    total = query.count()
    
    offset = (page - 1) * page_size
    products = query.offset(offset).limit(page_size).all()

    # Convert to response schemas and annotate if logged in
    response_items = []
    for p in products:
        p_resp = ProductResponse.model_validate(p)
        if current_user:
            p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)
        response_items.append(p_resp)

    has_more = (page * page_size) < total

    return ProductListResponse(
        data=response_items,
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            has_more=has_more
        )
    )

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """Get single product with caching. Returns 404 if deleted."""
    cache_key = f"product:{product_id}"
    
    # Try cache first (only for anonymous users to ensure fresh user state, or cache raw and annotate later)
    # We cache the raw DB dictionary payload to allow fast retrieval.
    cached_data = product_cache.get(cache_key)
    
    if cached_data:
        p_resp = ProductResponse(**cached_data)
    else:
        product = db.query(Product).filter(Product.id == product_id, Product.deleted_at == None).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        p_resp = ProductResponse.model_validate(product)
        # Store in cache with 60s TTL
        product_cache.set(cache_key, p_resp.model_dump(), ttl=60)

    # Annotate with user-specific state dynamically (never cached globally)
    if current_user:
        p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)

    return p_resp


@router.get("/{product_id}/similar", response_model=list[ProductResponse])
def get_similar_products(
    product_id: int,
    limit: int = Query(8, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """Return similar products using the Item-Cosine Similarity Matrix."""
    from app.services.rec_engine import rec_engine

    similar_ids = rec_engine.similar_products(product_id, n=limit, db=db)

    if not similar_ids:
        return []

    # Fetch products in order
    products_map = {}
    product_objs = db.query(Product).filter(
        Product.id.in_(similar_ids),
        Product.deleted_at == None
    ).all()
    for p in product_objs:
        products_map[p.id] = p

    result = []
    for pid in similar_ids:
        if pid in products_map:
            p_resp = ProductResponse.model_validate(products_map[pid])
            if current_user:
                p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)
            result.append(p_resp)

    return result
