"""
Seed the SQLite database from Excel files.
Reads: data/products.xlsx, data/users.xlsx, data/ratings.xlsx
Populates: products, users, ratings, favourites tables.

Usage:  cd backend && python seed_from_excel.py
"""
import os
import sys
import pandas as pd
from sqlalchemy import text

# Ensure the app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.db import engine, Base, SessionLocal
from app.models import User, Product, Rating, Favourite
from app.security import hash_password

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def read_excel(filename: str) -> pd.DataFrame:
    """Read an Excel file from the data/ directory."""
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"❌ File not found: {path}")
        sys.exit(1)
    df = pd.read_excel(path, engine="openpyxl")
    print(f"  Read {len(df)} rows from {filename}")
    return df


def clear_tables(db):
    """Clear all tables in the correct order to avoid FK constraint errors."""
    print("\n[CLEAR] Clearing existing data...")
    db.execute(text("DELETE FROM recommendation_dismissals"))
    db.execute(text("DELETE FROM order_items"))
    db.execute(text("DELETE FROM orders"))
    db.execute(text("DELETE FROM cart_items"))
    db.execute(text("DELETE FROM events"))
    db.execute(text("DELETE FROM favourites"))
    db.execute(text("DELETE FROM ratings"))
    db.execute(text("DELETE FROM users"))
    db.execute(text("DELETE FROM products"))
    db.commit()
    print("  [OK] Cleared all tables")


def seed_products(db, df: pd.DataFrame) -> int:
    """Insert products from DataFrame."""
    count = 0
    for _, row in df.iterrows():
        # Support both column names: 'image_file' and 'product_image_url'
        img_raw = row.get("image_file", row.get("product_image_url", ""))
        img_val = str(img_raw).strip() if pd.notna(img_raw) else ""

        product = Product(
            id=int(row["id"]),
            name=str(row["name"]),
            category=str(row.get("category", "")) or None,
            brand=str(row.get("brand", "")) or None,
            price=float(row["price"]),
            description=str(row.get("description", "")) or None,
            stock=int(row.get("stock", 50)),
            image_file=img_val if img_val else None,
        )
        db.add(product)
        count += 1
    db.commit()
    return count


def seed_users(db, df: pd.DataFrame) -> tuple[int, int]:
    """Insert users and parse favourites column. Returns (user_count, fav_count)."""
    user_count = 0
    fav_count = 0

    for _, row in df.iterrows():
        user = User(
            id=int(row["id"]),
            username=str(row["username"]).strip().lower(),
            full_name=str(row["full_name"]),
            email=str(row["email"]).strip().lower(),
            password_hash=hash_password(str(row["password"])),
            role=str(row.get("role", "user")).strip().lower(),
        )
        db.add(user)
        user_count += 1

    db.commit()

    # Parse favourites column (comma-separated product IDs)
    if "favourites" in df.columns:
        for _, row in df.iterrows():
            fav_str = str(row.get("favourites", ""))
            if not fav_str or fav_str == "nan":
                continue
            for part in fav_str.split(","):
                part = part.strip()
                if part.isdigit():
                    product_id = int(part)
                    fav = Favourite(
                        user_id=int(row["id"]),
                        product_id=product_id,
                    )
                    db.merge(fav)  # merge to avoid duplicates
                    fav_count += 1
        db.commit()

    return user_count, fav_count


def seed_ratings(db, df: pd.DataFrame) -> int:
    """Insert ratings from DataFrame."""
    count = 0
    for _, row in df.iterrows():
        rating = Rating(
            user_id=int(row["user_id"]),
            product_id=int(row["product_id"]),
            value=int(row["rating"]),
            is_synthetic=False,
        )
        db.merge(rating)  # merge handles duplicates via unique constraint
        count += 1
    db.commit()
    return count


def update_avg_ratings(db):
    """Compute avg_rating for each product from the ratings table."""
    db.execute(text("""
        UPDATE products SET avg_rating = (
            SELECT ROUND(AVG(CAST(value AS FLOAT)), 2)
            FROM ratings
            WHERE ratings.product_id = products.id
        )
    """))
    db.commit()


def main():
    print("=" * 60)
    print("  SEED FROM EXCEL — E-Commerce Recommendation System")
    print("=" * 60)

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Read Excel files
        print("\n[READ] Reading Excel files...")
        products_df = read_excel("products.xlsx")
        users_df = read_excel("users.xlsx")
        ratings_df = read_excel("ratings.xlsx")

        # Clear existing data
        clear_tables(db)

        # Seed products
        print("\n[PRODUCTS] Seeding products...")
        p_count = seed_products(db, products_df)

        # Seed users + favourites
        print("\n[USERS] Seeding users & favourites...")
        u_count, f_count = seed_users(db, users_df)

        # Seed ratings
        print("\n[RATINGS] Seeding ratings...")
        r_count = seed_ratings(db, ratings_df)

        # Compute avg_rating
        print("\n[COMPUTE] Computing product avg_rating...")
        update_avg_ratings(db)

        # Summary
        print("\n" + "=" * 60)
        print("  [OK] SEEDING COMPLETE")
        print("=" * 60)
        print(f"   Products:   {p_count}")
        print(f"   Users:      {u_count}")
        print(f"   Ratings:    {r_count}")
        print(f"   Favourites: {f_count}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
