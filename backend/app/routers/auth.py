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
    LoginRequest, LoginResponse,
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
