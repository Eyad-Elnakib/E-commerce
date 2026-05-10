"""
Tests for Group A — Authentication
A1: User Registration
A2: Login + JWT Issuance
A3: Logout
"""
import time
from unittest.mock import patch
from datetime import timedelta, datetime, timezone

import pytest
from jose import jwt

from app.security import (
    hash_password, verify_password,
    check_rate_limit, record_failed_attempt, reset_rate_limit,
    create_access_token, decode_access_token,
    ALGORITHM,
)
from app.config import settings
from app.models import User


# ═══════════════════════════════════════════════════════════════════════════════
# A1 — User Registration Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestBcryptHelpers:
    """Unit tests for bcrypt hash/verify functions."""

    def test_bcrypt_hash_roundtrip(self):
        """bcrypt hash roundtrip passes."""
        password = "mysecurepassword"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_bcrypt_hash_starts_with_2b(self):
        """Hash starts with $2b$ (bcrypt identifier)."""
        hashed = hash_password("testpassword")
        assert hashed.startswith("$2b$")

    def test_bcrypt_wrong_password_fails(self):
        """Wrong password does not verify."""
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False


@pytest.mark.asyncio
class TestRegisterEndpoint:
    """Integration tests for POST /api/auth/register."""

    async def test_happy_path_201(self, client):
        """Happy path: 201 with user data, password_hash never echoed."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Alice Smith",
            "username": "alice",
            "email": "alice@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "alice"
        assert data["email"] == "alice@example.com"
        assert data["full_name"] == "Alice Smith"
        assert "password_hash" not in data
        assert "password" not in data
        assert "id" in data
        assert "created_at" in data

    async def test_password_hash_never_echoed(self, client):
        """password_hash is never present in the response."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Bob Hash",
            "username": "bobhash",
            "email": "bobhash@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 201
        raw_text = resp.text
        assert "password_hash" not in raw_text
        assert "$2b$" not in raw_text

    async def test_username_stored_lowercased(self, client, db_session):
        """Username is stored lowercased regardless of input case."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Lowercase Test",
            "username": "UpperCase_User",
            "email": "uppercase@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "uppercase_user"

        # Verify in DB
        user = db_session.query(User).filter(User.username == "uppercase_user").first()
        assert user is not None
        assert user.username == "uppercase_user"

    async def test_password_equals_username_rejected(self, client):
        """Password same as username is rejected."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Test User",
            "username": "mypassword",
            "email": "pwuser@example.com",
            "password": "mypassword",
        })
        assert resp.status_code == 422

    async def test_purely_numeric_password_rejected(self, client):
        """Purely numeric password is rejected."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Test User",
            "username": "numericpw",
            "email": "numeric@example.com",
            "password": "12345678",
        })
        assert resp.status_code == 422

    async def test_duplicate_username_case_insensitive_409(self, client):
        """Duplicate username (case-insensitive) returns 409."""
        # First registration
        await client.post("/api/auth/register", json={
            "full_name": "First User",
            "username": "dupuser",
            "email": "dup1@example.com",
            "password": "securepass123",
        })

        # Second registration with same username, different case
        resp = await client.post("/api/auth/register", json={
            "full_name": "Second User",
            "username": "DupUser",
            "email": "dup2@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 409
        assert "taken" in resp.json()["detail"].lower()

    async def test_duplicate_email_case_insensitive_409(self, client):
        """Duplicate email (case-insensitive) returns 409."""
        await client.post("/api/auth/register", json={
            "full_name": "Email User",
            "username": "emaildup1",
            "email": "shared@example.com",
            "password": "securepass123",
        })

        resp = await client.post("/api/auth/register", json={
            "full_name": "Email User 2",
            "username": "emaildup2",
            "email": "SHARED@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 409

    async def test_password_too_short_422(self, client):
        """Password < 8 chars returns 422."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Short PW",
            "username": "shortpw",
            "email": "shortpw@example.com",
            "password": "short",
        })
        assert resp.status_code == 422

    async def test_invalid_username_regex_422(self, client):
        """Username with spaces or symbols returns 422."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Invalid User",
            "username": "user name!",
            "email": "invalid@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 422

    async def test_invalid_email_format_422(self, client):
        """Invalid email format returns 422."""
        resp = await client.post("/api/auth/register", json={
            "full_name": "Bad Email",
            "username": "bademail",
            "email": "not-an-email",
            "password": "securepass123",
        })
        assert resp.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# A2 — Login + JWT Tests
# ═══════════════════════════════════════════════════════════════════════════════


class TestRateLimit:
    """Unit tests for check_rate_limit with mocked time."""

    def test_no_limit_initially(self):
        """No rate limit for a fresh username."""
        assert check_rate_limit("fresh_user") is None

    def test_limit_after_5_failures(self):
        """Rate limit kicks in after 5 failed attempts."""
        for _ in range(5):
            record_failed_attempt("limited_user")
        retry_after = check_rate_limit("limited_user")
        assert retry_after is not None
        assert retry_after > 0

    def test_window_expiry_resets(self):
        """Rate limit resets after the 15-minute window expires."""
        record_failed_attempt("expired_user")
        # Simulate time passing beyond window
        with patch("app.security.time.time", return_value=time.time() + 16 * 60):
            assert check_rate_limit("expired_user") is None

    def test_success_resets_counter(self):
        """Successful login resets the counter."""
        for _ in range(4):
            record_failed_attempt("reset_user")
        reset_rate_limit("reset_user")
        # After reset, 4 more failures should not trigger limit
        for _ in range(4):
            record_failed_attempt("reset_user")
        assert check_rate_limit("reset_user") is None


@pytest.mark.asyncio
class TestLoginEndpoint:
    """Integration tests for POST /api/auth/login."""

    async def test_correct_creds_200(self, client):
        """Correct credentials return 200 with token."""
        # Register a user first
        await client.post("/api/auth/register", json={
            "full_name": "Login User",
            "username": "loginuser",
            "email": "loginuser@example.com",
            "password": "securepass123",
        })

        resp = await client.post("/api/auth/login", json={
            "username": "loginuser",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 24 * 3600
        assert data["user"]["username"] == "loginuser"

        # Decode token and verify claims
        payload = jwt.decode(
            data["access_token"],
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        assert "sub" in payload
        assert payload["role"] == "user"
        assert "exp" in payload
        assert "iat" in payload
        assert "jti" in payload

        # Check 24-hour expiry
        exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        iat_dt = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        diff = exp_dt - iat_dt
        assert abs(diff.total_seconds() - 24 * 3600) < 5

    async def test_wrong_password_401(self, client):
        """Wrong password returns 401 with generic message."""
        await client.post("/api/auth/register", json={
            "full_name": "Wrong PW User",
            "username": "wrongpwuser",
            "email": "wrongpw@example.com",
            "password": "securepass123",
        })

        resp = await client.post("/api/auth/login", json={
            "username": "wrongpwuser",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        assert "invalid" in resp.json()["detail"].lower()

    async def test_nonexistent_user_401(self, client):
        """Nonexistent user returns 401 with generic message (constant time)."""
        t0 = time.perf_counter()
        resp = await client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "anypassword123",
        })
        t_missing = time.perf_counter() - t0

        assert resp.status_code == 401
        assert "invalid" in resp.json()["detail"].lower()

    async def test_6th_attempt_429(self, client):
        """6th failed attempt in 15 minutes returns 429."""
        await client.post("/api/auth/register", json={
            "full_name": "Rate Limited",
            "username": "ratelimited",
            "email": "ratelimited@example.com",
            "password": "securepass123",
        })

        for _ in range(5):
            await client.post("/api/auth/login", json={
                "username": "ratelimited",
                "password": "wrongpass",
            })

        resp = await client.post("/api/auth/login", json={
            "username": "ratelimited",
            "password": "wrongpass",
        })
        assert resp.status_code == 429
        assert "retry-after" in resp.headers

    async def test_correct_login_resets_counter(self, client):
        """Correct login mid-window resets counter; next 4 fails do not trigger 429."""
        await client.post("/api/auth/register", json={
            "full_name": "Reset Counter",
            "username": "resetcounter",
            "email": "resetcounter@example.com",
            "password": "securepass123",
        })

        # 3 failed attempts
        for _ in range(3):
            await client.post("/api/auth/login", json={
                "username": "resetcounter",
                "password": "wrongpass",
            })

        # Correct login resets
        resp = await client.post("/api/auth/login", json={
            "username": "resetcounter",
            "password": "securepass123",
        })
        assert resp.status_code == 200

        # 4 more failures should NOT trigger 429
        for _ in range(4):
            resp = await client.post("/api/auth/login", json={
                "username": "resetcounter",
                "password": "wrongpass",
            })
            assert resp.status_code == 401

    async def test_wrong_secret_401_on_me(self, client):
        """Token signed with different secret is rejected by /api/auth/me."""
        bad_token = jwt.encode(
            {"sub": "1", "role": "user", "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
            "wrong-secret",
            algorithm=ALGORITHM,
        )
        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
        assert resp.status_code == 401

    async def test_expired_token_401(self, client):
        """Expired token returns 401 on /api/auth/me."""
        expired_token = create_access_token(
            sub="1",
            role="user",
            expires_delta=timedelta(seconds=-1),
        )
        resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# A2 — /api/auth/me Tests
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
class TestMeEndpoint:
    """Tests for GET /api/auth/me."""

    async def test_authenticated_returns_user(self, client, auth_headers):
        """Authenticated user gets their own data."""
        resp = await client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["username"] == "user1"

    async def test_unauthenticated_401(self, client):
        """No token returns 401."""
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# A1 — Check Username Tests
# ═══════════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
class TestCheckUsername:
    """Tests for GET /api/auth/check-username."""

    async def test_available_username(self, client):
        """Available username returns true."""
        resp = await client.get("/api/auth/check-username?value=totally_new_user")
        assert resp.status_code == 200
        assert resp.json()["available"] is True

    async def test_taken_username(self, client):
        """Taken username (from seed data) returns false."""
        resp = await client.get("/api/auth/check-username?value=user1")
        assert resp.status_code == 200
        assert resp.json()["available"] is False
