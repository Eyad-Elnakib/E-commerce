"""
Test configuration and fixtures.
Seeded SQLite per test session: 5 users, 20 products, 100 ratings.
"""
import os
import sys
import random
from datetime import datetime

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient, ASGITransport

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db import Base
from app.main import app
from app.deps import get_db
from app.models import User, Product, Rating
from app.security import hash_password, clear_all_rate_limits

# Use an in-memory SQLite database for tests
TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(test_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the dependency
app.dependency_overrides[get_db] = override_get_db


def make_register_payload(**overrides) -> dict:
    """Factory helper producing valid registration payloads."""
    payload = {
        "full_name": "Test User",
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepass123",
    }
    payload.update(overrides)
    return payload


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables and seed data once per test session."""
    # Create tables
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestSessionLocal()
    try:
        # Seed 5 users
        users = []
        for i in range(1, 6):
            user = User(
                full_name=f"Test User {i}",
                username=f"user{i}",
                email=f"user{i}@example.com",
                password_hash=hash_password("password123"),
                role="user",
            )
            db.add(user)
            users.append(user)

        db.commit()

        # Seed 20 products
        categories = ["Electronics", "Books", "Clothing", "Home", "Sports"]
        brands = ["BrandA", "BrandB", "BrandC", "BrandD"]
        products = []
        for i in range(1, 21):
            product = Product(
                name=f"Product {i}",
                category=categories[i % len(categories)],
                brand=brands[i % len(brands)],
                price=round(random.uniform(10.0, 200.0), 2),
                description=f"Description for product {i}",
                avg_rating=round(random.uniform(1.0, 5.0), 2),
                stock=random.randint(0, 100),
            )
            db.add(product)
            products.append(product)

        db.commit()

        # Seed 100 ratings
        for user in users:
            db.refresh(user)
        for product in products:
            db.refresh(product)

        rating_pairs = set()
        for _ in range(100):
            while True:
                user = random.choice(users)
                product = random.choice(products)
                pair = (user.id, product.id)
                if pair not in rating_pairs:
                    rating_pairs.add(pair)
                    break

            rating = Rating(
                user_id=user.id,
                product_id=product.id,
                value=random.randint(1, 5),
            )
            db.add(rating)

        db.commit()
    finally:
        db.close()

    yield

    # Cleanup
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    # Remove test database file
    try:
        if os.path.exists("test.db"):
            os.remove("test.db")
    except PermissionError:
        pass  # Windows may hold the file; acceptable in test teardown


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limits between tests."""
    clear_all_rate_limits()
    yield
    clear_all_rate_limits()


@pytest.fixture
def db_session():
    """Provide a database session for direct DB assertions in tests."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    """Provide an httpx AsyncClient for testing."""
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://testserver")


@pytest.fixture
def auth_headers(db_session):
    """Return headers with a valid user token for seeded user1."""
    from app.security import create_access_token
    user = db_session.query(User).filter(User.username == "user1").first()
    token = create_access_token(sub=str(user.id), role=user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(db_session):
    """Return headers with a valid admin token. Creates admin if needed."""
    admin = db_session.query(User).filter(User.username == "testadmin").first()
    if admin is None:
        admin = User(
            full_name="Test Admin",
            username="testadmin",
            email="admin@test.com",
            password_hash=hash_password("adminpass123"),
            role="admin",
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

    from app.security import create_access_token
    token = create_access_token(sub=str(admin.id), role=admin.role)
    return {"Authorization": f"Bearer {token}"}
