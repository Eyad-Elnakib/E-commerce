"""
Admin router for managing products.
Requires 'admin' role.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.deps import get_db, require_admin
from app.models import Product
from app.schemas import ProductCreate, ProductUpdate, ProductResponse
from app.services.event_bus import event_bus

from app.services.admin_logger import log_admin_action

router = APIRouter(prefix="/api/admin/products", tags=["admin"])

@router.get("", response_model=list[ProductResponse])
def list_products(
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """List products for admin, optionally including soft-deleted ones."""
    query = db.query(Product)
    if not include_deleted:
        query = query.filter(Product.deleted_at == None)
    return query.all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Create a new product."""
    product = Product(
        name=req.name,
        category=req.category,
        brand=req.brand,
        price=req.price,
        description=req.description,
        stock=req.stock,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log_admin_action(admin_user.username, "create_product", str(product.id), req.model_dump())
    return product

@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Update a product. Emits cache invalidation event."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)

    # Invalidate cache
    event_bus.publish("product_updated", product_id=product_id)
    log_admin_action(admin_user.username, "update_product", str(product.id), update_data)

    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Soft-delete a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.deleted_at = datetime.now(timezone.utc)
    db.commit()
    
    # Invalidate cache
    event_bus.publish("product_updated", product_id=product_id)
    log_admin_action(admin_user.username, "delete_product", str(product.id), {"deleted": True})

@router.post("/{product_id}/restore", response_model=ProductResponse)
def restore_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Restore a soft-deleted product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.deleted_at = None
    db.commit()
    db.refresh(product)
    
    # Invalidate cache
    event_bus.publish("product_updated", product_id=product_id)
    log_admin_action(admin_user.username, "restore_product", str(product.id), {"restored": True})
    
    return product

import uuid
from pathlib import Path
from fastapi import UploadFile, File

DATA_DIR = Path(__file__).parent.parent.parent / "data"

@router.post("/{product_id}/image", response_model=ProductResponse)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_user=Depends(require_admin),
):
    """Upload an image for a product."""
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG are allowed.")

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Read the file content
    contents = file.file.read()
    
    # Check file size (>5MB -> 413)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    ext = ".jpg" if file.content_type == "image/jpeg" else ".png"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = DATA_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    product.image_file = filename
    db.commit()
    db.refresh(product)
    
    # Invalidate cache
    event_bus.publish("product_updated", product_id=product_id)
    log_admin_action(admin_user.username, "upload_image", str(product.id), {"image_file": filename})

    return product
