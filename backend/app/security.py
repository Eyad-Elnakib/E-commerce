"""
bcrypt helpers, JWT encode/decode, and in-process login rate limiter.
"""
import time
import uuid
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

from passlib.context import CryptContext
from jose import jwt, JWTError

from app.config import settings

# ─── bcrypt ───────────────────────────────────────────────────────────────────

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)

# Fixed dummy hash for constant-time verification when user doesn't exist
DUMMY_HASH = pwd_context.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWT ──────────────────────────────────────────────────────────────────────

ALGORITHM = "HS256"


def create_access_token(
    sub: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT access token with sub, role, exp, iat, jti claims."""
    now = datetime.now(timezone.utc)
    if expires_delta is None:
        expires_delta = timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    expire = now + expires_delta

    payload = {
        "sub": sub,
        "role": role,
        "exp": expire,
        "iat": now,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


# ─── In-process login rate limiter ────────────────────────────────────────────

_rate_limit_store: dict[str, tuple[int, float]] = {}
_rate_limit_lock = Lock()

MAX_FAILED_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 15 * 60  # 15 minutes


def check_rate_limit(username: str) -> Optional[int]:
    """
    Check if a username is rate-limited.
    Returns the Retry-After value in seconds if limited, None otherwise.
    """
    username_lower = username.lower()
    with _rate_limit_lock:
        entry = _rate_limit_store.get(username_lower)
        if entry is None:
            return None
        count, first_ts = entry
        elapsed = time.time() - first_ts
        if elapsed > RATE_LIMIT_WINDOW_SECONDS:
            # Window expired — clean up
            del _rate_limit_store[username_lower]
            return None
        if count >= MAX_FAILED_ATTEMPTS:
            retry_after = int(RATE_LIMIT_WINDOW_SECONDS - elapsed) + 1
            return retry_after
        return None


def record_failed_attempt(username: str) -> None:
    """Record a failed login attempt for rate limiting."""
    username_lower = username.lower()
    now = time.time()
    with _rate_limit_lock:
        entry = _rate_limit_store.get(username_lower)
        if entry is None:
            _rate_limit_store[username_lower] = (1, now)
        else:
            count, first_ts = entry
            elapsed = now - first_ts
            if elapsed > RATE_LIMIT_WINDOW_SECONDS:
                # Window expired — start fresh
                _rate_limit_store[username_lower] = (1, now)
            else:
                _rate_limit_store[username_lower] = (count + 1, first_ts)


def reset_rate_limit(username: str) -> None:
    """Reset the rate limit counter on successful login."""
    username_lower = username.lower()
    with _rate_limit_lock:
        _rate_limit_store.pop(username_lower, None)


def clear_all_rate_limits() -> None:
    """Clear all rate limit entries. Used in testing."""
    with _rate_limit_lock:
        _rate_limit_store.clear()
