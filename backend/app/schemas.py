"""
All Pydantic request/response schemas.
"""
import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    username: str = Field(..., min_length=1, max_length=32)
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.lower()
        if not re.match(r"^[a-z0-9_]+$", v):
            raise ValueError("Username must contain only lowercase letters, numbers, and underscores")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_lowercase(cls, v: str) -> str:
        return v.lower()

    @model_validator(mode="after")
    def validate_password_rules(self):
        """Password must not equal username and must not be purely numeric."""
        if self.password.lower() == self.username.lower():
            raise ValueError("Password must not be the same as your username")
        if self.password.isdigit():
            raise ValueError("Password must not be purely numeric")
        return self


class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    onboarding_completed: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class OnboardingRequest(BaseModel):
    """Request payload for the new-user onboarding quiz."""
    favourite_categories: list[str] = Field(..., min_length=1, max_length=10)
    liked_product_ids: list[int] = Field(default=[], max_length=20)


class UsernameCheckResponse(BaseModel):
    available: bool


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


# ─── Product Schemas ──────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    price: float = Field(..., gt=0)
    description: Optional[str] = None
    stock: int = Field(0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    stock: Optional[int] = Field(None, ge=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    category: Optional[str]
    brand: Optional[str]
    price: float
    description: Optional[str]
    avg_rating: Optional[float]
    stock: int
    image_file: Optional[str]
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    is_favourited: bool = False
    is_in_cart: bool = False
    user_rating: Optional[int] = None

    model_config = {"from_attributes": True}


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    has_more: bool


class ProductListResponse(BaseModel):
    data: list[ProductResponse]
    meta: PaginationMeta


# ─── Cart Schemas ─────────────────────────────────────────────────────────────

class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(..., ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=0)


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_add: float
    product: Optional[ProductResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    subtotal: float
    item_count: int


# ─── Order Schemas ────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    payment_method: str = Field(..., pattern=r"^(cod|card)$")
    card_token: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    order_id: int = Field(alias="id")
    status: str
    total: float
    items: list[OrderItemResponse]
    payment_method: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Event Schemas ────────────────────────────────────────────────────────────

class EventItem(BaseModel):
    event_type: str
    product_id: Optional[int] = None
    session_id: Optional[str] = None
    client_ts: Optional[datetime] = None
    payload: Optional[dict] = None


class EventBatchRequest(BaseModel):
    events: list[EventItem] = Field(..., min_length=1, max_length=50)


# ─── Recommendation Schemas ──────────────────────────────────────────────────

class GiftRequest(BaseModel):
    recipient: str
    occasion: str
    personality: str
    budget: str
    age_group: str
    free_text: Optional[str] = Field(None, max_length=200)


class RecommendationItem(BaseModel):
    product: ProductResponse
    match_percent: int = Field(..., ge=0, le=100)
    explanation: str


class GiftResponse(BaseModel):
    items: list[RecommendationItem]


class FeedMethodGroup(BaseModel):
    method_name: str
    products: list[dict]

class FeedResponse(BaseModel):
    groups: list[FeedMethodGroup]
    generated_at: datetime
    from_cache: bool


# ─── Admin Schemas ────────────────────────────────────────────────────────────

class SimulationAction(BaseModel):
    type: str = Field(..., pattern=r"^(rating|purchase)$")
    product_id: int
    value: Optional[int] = Field(None, ge=1, le=5)

    @model_validator(mode="after")
    def validate_rating_value(self):
        if self.type == "rating" and self.value is None:
            raise ValueError("Rating actions require a value between 1 and 5")
        return self


class SimulationRequest(BaseModel):
    user_id: int
    actions: list[SimulationAction] = Field(..., min_length=1)


class SimulationResponse(BaseModel):
    inserted: dict


# ─── Metrics Schemas ──────────────────────────────────────────────────────────

class MethodMetrics(BaseModel):
    method: str
    precision_at_10: float
    recall_at_10: float
    ndcg_at_10: float
    accuracy: float
    rmse: Optional[float] = None


class GlobalMetricsResponse(BaseModel):
    generated_at: datetime
    methods: list[MethodMetrics]


class UserMethodMetrics(BaseModel):
    method: str
    precision_at_10: float
    list: list[dict]


class UserMetricsResponse(BaseModel):
    user: UserPublic
    methods: list[UserMethodMetrics]
