"""
Favourites router for managing user's favourite products.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.deps import get_db, get_current_user
from app.models import Favourite, Product
from app.schemas import ProductResponse
from app.routers.products import annotate_product_with_user_state

router = APIRouter(prefix="/api/favourites", tags=["favourites"])

@router.get("", response_model=list[ProductResponse])
def get_favourites(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get all products favourited by the user."""
    # Query products joined with favourites
    fav_products = db.query(Product).join(
        Favourite, Favourite.product_id == Product.id
    ).filter(
        Favourite.user_id == current_user.id,
        Product.deleted_at == None
    ).order_by(Favourite.created_at.desc()).all()

    response_items = []
    for p in fav_products:
        p_resp = ProductResponse.model_validate(p)
        p_resp = annotate_product_with_user_state(p_resp, current_user.id, db)
        response_items.append(p_resp)

    return response_items

@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
def add_favourite(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Add a product to favourites. Idempotent."""
    # Ensure product exists (even if soft-deleted)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    fav = db.query(Favourite).filter(
        Favourite.user_id == current_user.id,
        Favourite.product_id == product_id
    ).first()

    if not fav:
        fav = Favourite(user_id=current_user.id, product_id=product_id)
        db.add(fav)
        try:
            db.commit()
            from app.services.event_bus import event_bus
            event_bus.publish("favourite.added", user_id=current_user.id, product_id=product_id)
        except IntegrityError:
            db.rollback()

    return {"status": "added"}

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favourite(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Remove a product from favourites."""
    fav = db.query(Favourite).filter(
        Favourite.user_id == current_user.id,
        Favourite.product_id == product_id
    ).first()

    if fav:
        db.delete(fav)
        db.commit()
        from app.services.event_bus import event_bus
        event_bus.publish("favourite.removed", user_id=current_user.id, product_id=product_id)
    
    return None
