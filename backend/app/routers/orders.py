"""
Orders router for checkout and order history.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from app.db import SessionLocal
from app.deps import get_db, get_current_user
from app.models import CartItem, Order, OrderItem, Product
from app.schemas import OrderCreate, OrderResponse
from app.services.event_bus import event_bus

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    req: OrderCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Place an order from the current cart."""
    # Check idempotency
    if idempotency_key:
        existing_order = db.query(Order).filter(
            Order.user_id == current_user.id,
            Order.idempotency_key == idempotency_key
        ).first()
        if existing_order:
            return existing_order

    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = 0
    # Validate stock before creating anything
    for item in cart_items:
        if item.product.stock < item.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough stock for {item.product.name}"
            )
        total += item.product.price * item.quantity

    new_order = Order(
        user_id=current_user.id,
        status="confirmed",
        payment_method=req.payment_method,
        total=total,
        idempotency_key=idempotency_key
    )
    db.add(new_order)
    db.flush() # get order ID

    for item in cart_items:
        # Decrement stock
        item.product.stock -= item.quantity
        
        # Create order item
        order_item = OrderItem(
            order_id=new_order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price_at_purchase=item.product.price
        )
        db.add(order_item)
        
        # Remove from cart
        db.delete(item)

    try:
        db.commit()
        db.refresh(new_order)
        # Invalidate cache for all products bought
        for item in cart_items:
            event_bus.publish("product_updated", product_id=item.product_id)
        return new_order
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Order conflict, please try again")

@router.get("", response_model=List[OrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get user's order history."""
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()
    return orders

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get specific order details."""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
