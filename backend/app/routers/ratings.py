from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import SessionLocal
from app.deps import get_db, get_current_user
from app.models import Rating, Product
from app.services.event_bus import event_bus

router = APIRouter(prefix="/api/ratings", tags=["ratings"])

class RatingRequest(BaseModel):
    value: int = Field(..., ge=1, le=5)

@router.post("/{product_id}", status_code=status.HTTP_200_OK)
def add_rating(
    product_id: int,
    req: RatingRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Add or update a user rating for a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    rating = db.query(Rating).filter(
        Rating.user_id == current_user.id,
        Rating.product_id == product_id
    ).first()

    if rating:
        rating.value = req.value
        rating.is_synthetic = False
    else:
        rating = Rating(
            user_id=current_user.id,
            product_id=product_id,
            value=req.value,
            is_synthetic=False
        )
        db.add(rating)
        
    db.commit()

    # Recalculate avg_rating
    avg_r = db.query(func.avg(Rating.value)).filter(Rating.product_id == product_id).scalar()
    if avg_r is not None:
        product.avg_rating = float(avg_r)
        db.commit()

    event_bus.publish("rating.created", user_id=current_user.id, product_id=product_id)
    
    return {"status": "success", "user_rating": req.value, "avg_rating": product.avg_rating}
