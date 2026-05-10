"""
Cart router for managing user's shopping cart.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.deps import get_db, get_current_user
from app.models import CartItem, Product
from app.schemas import CartItemResponse, CartItemAdd, CartItemUpdate

router = APIRouter(prefix="/api/cart", tags=["cart"])

@router.get("", response_model=List[CartItemResponse])
def get_cart(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get the current user's cart."""
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    return items

@router.post("", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    req: CartItemAdd,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Add a product to the cart."""
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if product.stock < req.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")

    # Check if already in cart
    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == req.product_id
    ).first()

    if existing:
        new_quantity = existing.quantity + req.quantity
        if product.stock < new_quantity:
            raise HTTPException(status_code=400, detail="Not enough stock")
        existing.quantity = new_quantity
        existing.price_at_add = product.price # update price to latest
        db.commit()
        db.refresh(existing)
        return existing

    new_item = CartItem(
        user_id=current_user.id,
        product_id=req.product_id,
        quantity=req.quantity,
        price_at_add=product.price
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/{item_id}", response_model=CartItemResponse)
def update_cart_item(
    item_id: int,
    req: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update quantity of a cart item."""
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
        
    product = item.product
    if product.stock < req.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock")
        
    if req.quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=204, detail="Item removed")
        
    item.quantity = req.quantity
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_cart(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Remove item from cart."""
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id
    ).first()
    
    if item:
        db.delete(item)
        db.commit()
    return None
