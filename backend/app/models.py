"""
All ORM models.
"""
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean, DateTime,
    ForeignKey, CheckConstraint, UniqueConstraint, Index, JSON,
)
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    username = Column(String(32), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(60), nullable=False)
    role = Column(String(10), default="user", nullable=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    ratings = relationship("Rating", back_populates="user")
    favourites = relationship("Favourite", back_populates="user")
    cart_items = relationship("CartItem", back_populates="user")
    orders = relationship("Order", back_populates="user")
    events = relationship("Event", back_populates="user")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(Text, nullable=True)
    avg_rating = Column(Numeric(3, 2), nullable=True)
    stock = Column(Integer, default=0)
    image_file = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_products_category_active", "category", sqlite_where=deleted_at.is_(None)),
        Index("ix_products_price", "price"),
        Index("ix_products_brand", "brand"),
    )

    # Relationships
    ratings = relationship("Rating", back_populates="product")
    favourites = relationship("Favourite", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    value = Column(Integer, nullable=False)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("value BETWEEN 1 AND 5", name="ck_rating_value"),
        UniqueConstraint("user_id", "product_id", name="uq_rating_user_product"),
        Index("ix_ratings_user_created", "user_id", "created_at"),
        Index("ix_ratings_product", "product_id"),
    )

    user = relationship("User", back_populates="ratings")
    product = relationship("Product", back_populates="ratings")


class Favourite(Base):
    __tablename__ = "favourites"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_favourites_user", "user_id"),
    )

    user = relationship("User", back_populates="favourites")
    product = relationship("Product", back_populates="favourites")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_add = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("quantity >= 1", name="ck_cart_quantity"),
        UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
        Index("ix_cart_items_user", "user_id"),
    )

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False)
    payment_method = Column(String(10), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    idempotency_key = Column(String(255), nullable=True)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'confirmed', 'failed')", name="ck_order_status"),
        CheckConstraint("payment_method IN ('cod', 'card')", name="ck_order_payment"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_order_idempotency"),
    )

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price_at_purchase = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(50), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    session_id = Column(String(255), nullable=True)
    client_ts = Column(DateTime, nullable=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_events_user_created", "user_id", "created_at"),
    )

    user = relationship("User", back_populates="events")


class ProductRating(Base):
    __tablename__ = "product_ratings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    value = Column(Integer, nullable=False)
    is_synthetic = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("value >= 1 AND value <= 5", name="ck_rating_value"),
        UniqueConstraint("user_id", "product_id", name="uq_rating_user_product"),
    )


class RecommendationDismissal(Base):
    __tablename__ = "recommendation_dismissals"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MetricsSnapshot(Base):
    __tablename__ = "metrics_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    generated_at = Column(DateTime, nullable=False)
    payload_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
