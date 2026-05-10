from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db import SessionLocal
from app.deps import get_db, require_admin
from app.models import User, Product, ProductRating, Order, OrderItem
from app.schemas import SimulationRequest, SimulationResponse
from app.services.admin_logger import log_admin_action

router = APIRouter(prefix="/api/admin", tags=["admin", "simulation"])

@router.post("/simulate", response_model=SimulationResponse)
def simulate_user_actions(
    req: SimulationRequest,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Simulate ratings and purchases for a given user."""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    ratings_inserted = 0
    orders_inserted = 0
    
    # Pre-validate all products exist
    product_ids = [action.product_id for action in req.actions]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}
    
    for action in req.actions:
        if action.product_id not in product_map:
            raise HTTPException(status_code=400, detail=f"Product ID {action.product_id} not found")
            
    for action in req.actions:
        product = product_map[action.product_id]
        if action.type == "rating":
            # UPSERT or INSERT
            existing_rating = db.query(ProductRating).filter(
                ProductRating.user_id == user.id,
                ProductRating.product_id == action.product_id
            ).first()
            if existing_rating:
                existing_rating.value = action.value
                existing_rating.is_synthetic = True
            else:
                new_rating = ProductRating(
                    user_id=user.id,
                    product_id=action.product_id,
                    value=action.value,
                    is_synthetic=True
                )
                db.add(new_rating)
            ratings_inserted += 1
            
        elif action.type == "purchase":
            # Create order and order item
            new_order = Order(
                user_id=user.id,
                status="confirmed",
                payment_method="card",
                total=product.price,
                is_synthetic=True
            )
            db.add(new_order)
            db.flush() # get ID
            
            new_item = OrderItem(
                order_id=new_order.id,
                product_id=product.id,
                quantity=1,
                price_at_purchase=product.price
            )
            db.add(new_item)
            orders_inserted += 1

    db.commit()
    
    log_admin_action(
        admin_username=admin_user.username,
        action="simulate",
        target_id=str(user.id),
        diff={"ratings": ratings_inserted, "orders": orders_inserted}
    )
    
    return {"inserted": {"ratings": ratings_inserted, "orders": orders_inserted}}
