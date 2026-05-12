"""
Auth router: /api/auth/*
Features: A1 (Register), A2 (Login + JWT), A3 (Logout)
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.deps import get_db, get_current_user
from app.models import User
from app.schemas import (
    RegisterRequest, UserPublic, UsernameCheckResponse,
    LoginRequest, LoginResponse, OnboardingRequest,
)
from app.security import (
    hash_password, verify_password, create_access_token,
    check_rate_limit, record_failed_attempt, reset_rate_limit,
    DUMMY_HASH,
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. Role always inserts as 'user' regardless of payload."""
    # Hash password
    password_hash = hash_password(req.password)

    user = User(
        full_name=req.full_name,
        username=req.username,  # Already lowercased by validator
        email=req.email,        # Already lowercased by validator
        password_hash=password_hash,
        role="user",            # ALWAYS 'user' — ignore any role in payload
    )

    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already taken",
        )

    return user


@router.get("/check-username", response_model=UsernameCheckResponse)
def check_username(value: str, db: Session = Depends(get_db)):
    """Check if a username is available."""
    normalized = value.lower().strip()
    existing = db.query(User).filter(User.username == normalized).first()
    return UsernameCheckResponse(available=existing is None)


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and issue JWT."""
    username_lower = req.username.lower()

    # Check rate limit first
    retry_after = check_rate_limit(username_lower)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )

    # Fetch user by lowercased username
    user = db.query(User).filter(User.username == username_lower).first()

    if user is None:
        # Constant-time: verify against dummy hash to prevent timing attacks
        verify_password(req.password, DUMMY_HASH)
        record_failed_attempt(username_lower)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Verify password
    if not verify_password(req.password, user.password_hash):
        record_failed_attempt(username_lower)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Success — reset rate limit counter
    reset_rate_limit(username_lower)

    # Issue JWT
    token = create_access_token(sub=str(user.id), role=user.role)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_HOURS * 3600

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserPublic.model_validate(user),
    )


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """
    Logout endpoint (no-op server-side).
    JWTs are stateless — logout is handled client-side by clearing the token.
    """
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/onboarding", response_model=UserPublic)
def complete_onboarding(
    req: OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Save the new user's preferences to solve the Cold Start Problem.
    Creates implicit 5-star ratings for liked products and 4-star ratings
    for random products in their favourite categories.
    """
    from app.models import Rating, Favourite, Product
    from sqlalchemy import func

    # 1. Create ratings for explicitly liked products
    for pid in req.liked_product_ids:
        product = db.query(Product).filter(Product.id == pid, Product.deleted_at == None).first()
        if not product:
            continue
        # Add as favourite
        fav = Favourite(user_id=current_user.id, product_id=pid)
        db.merge(fav)
        # Add implicit 5-star rating
        existing = db.query(Rating).filter(
            Rating.user_id == current_user.id,
            Rating.product_id == pid
        ).first()
        if not existing:
            db.add(Rating(user_id=current_user.id, product_id=pid, value=5))

    # 2. For favourite categories with no liked products, add implicit 4-star ratings
    #    to 2 random products from each category so the engine has data to work with
    liked_set = set(req.liked_product_ids)
    for cat in req.favourite_categories:
        # Get up to 2 random products from this category that weren't already liked
        cat_products = (
            db.query(Product)
            .filter(Product.category == cat, Product.deleted_at == None, ~Product.id.in_(liked_set))
            .order_by(func.random())
            .limit(2)
            .all()
        )
        for p in cat_products:
            existing = db.query(Rating).filter(
                Rating.user_id == current_user.id,
                Rating.product_id == p.id
            ).first()
            if not existing:
                db.add(Rating(user_id=current_user.id, product_id=p.id, value=4))

    # 3. Mark onboarding as completed
    current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)

    # 4. Invalidate recommendation engine + feed cache so the user gets
    #    personalized results immediately on their first feed visit
    from app.services.rec_engine import rec_engine
    from app.cache import cache
    rec_engine.invalidate()
    cache.invalidate_prefix(f"rec:user:{current_user.id}")

    return current_user
