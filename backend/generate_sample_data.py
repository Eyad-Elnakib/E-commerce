"""
Generate realistic sample Excel data for the recommendation engine.
Creates: products.xlsx, users.xlsx, ratings.xlsx in backend/data/

Users are grouped into 5 "taste clusters" so that Collaborative Filtering
can discover real patterns. Each cluster prefers certain categories.
"""
import random
import os
import pandas as pd

random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ─── Categories & Brands ────────────────────────────────────────────────────

CATEGORIES = {
    "Electronics":       ["Samsung", "Apple", "Sony", "LG", "Bose", "JBL", "Anker"],
    "Clothing":          ["Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Levi's"],
    "Books":             ["Penguin", "HarperCollins", "Wiley", "O'Reilly", "Pearson"],
    "Home & Kitchen":    ["IKEA", "KitchenAid", "Dyson", "Philips", "Cuisinart"],
    "Sports & Outdoors": ["Nike", "Under Armour", "Columbia", "The North Face", "Puma"],
    "Beauty":            ["L'Oreal", "Nivea", "Dove", "Maybelline", "Clinique"],
    "Food & Beverages":  ["Nescafe", "Lipton", "Cadbury", "Lindt", "Starbucks"],
    "Toys & Games":      ["LEGO", "Hasbro", "Mattel", "Fisher-Price", "Ravensburger"],
    "Health & Wellness": ["Fitbit", "Oral-B", "Omron", "Nature Made", "Centrum"],
    "Music":             ["Fender", "Yamaha", "Roland", "Casio", "Shure"],
    "Office Supplies":   ["HP", "Epson", "Logitech", "3M", "Staedtler"],
    "Garden":            ["Bosch", "Gardena", "Black+Decker", "Husqvarna", "Weber"],
}

DESCRIPTIONS = {
    "Electronics":       ["Smart device with advanced features", "High-performance gadget for everyday use",
                          "Wireless technology with long battery life", "Premium build quality with sleek design"],
    "Clothing":          ["Comfortable fabric with modern fit", "Stylish everyday wear for all seasons",
                          "Breathable material perfect for active lifestyles", "Classic design with premium stitching"],
    "Books":             ["Bestselling title with insightful content", "Comprehensive guide for learners",
                          "Award-winning narrative that captivates readers", "Practical knowledge for personal growth"],
    "Home & Kitchen":    ["Durable home essential for daily cooking", "Modern design that fits any kitchen",
                          "Easy to clean and maintain", "Energy-efficient appliance for smart homes"],
    "Sports & Outdoors": ["Professional-grade sports equipment", "Lightweight and durable for outdoor adventures",
                          "Designed for maximum performance", "All-weather gear for active lifestyles"],
    "Beauty":            ["Gentle formula for sensitive skin", "Long-lasting effect with natural ingredients",
                          "Dermatologist-tested luxury product", "Premium self-care essential"],
    "Food & Beverages":  ["Rich flavor crafted from premium ingredients", "Organic and sustainably sourced",
                          "Perfect treat for food enthusiasts", "Gourmet quality for everyday enjoyment"],
    "Toys & Games":      ["Educational toy that sparks creativity", "Hours of family entertainment",
                          "Safe materials for all ages", "Award-winning design for kids"],
    "Health & Wellness": ["Clinically proven wellness solution", "Daily health companion for better living",
                          "Natural ingredients for holistic care", "Smart health monitoring device"],
    "Music":             ["Professional sound quality instrument", "Perfect for beginners and experts",
                          "Rich tone with durable construction", "Studio-grade audio equipment"],
    "Office Supplies":   ["Reliable office tool for productivity", "Ergonomic design for long work sessions",
                          "High-quality print and performance", "Essential workplace companion"],
    "Garden":            ["Powerful outdoor tool for garden care", "Eco-friendly garden equipment",
                          "Easy to use with professional results", "Built to last through all seasons"],
}

# ─── Taste Clusters (for realistic CF patterns) ─────────────────────────────

CLUSTERS = {
    0: {"preferred": ["Electronics", "Office Supplies", "Music"],       "name": "Tech Enthusiasts"},
    1: {"preferred": ["Books", "Health & Wellness", "Office Supplies"], "name": "Bookworms"},
    2: {"preferred": ["Clothing", "Beauty", "Music"],                   "name": "Fashion & Style"},
    3: {"preferred": ["Food & Beverages", "Home & Kitchen", "Garden"],  "name": "Home Cooks"},
    4: {"preferred": ["Sports & Outdoors", "Toys & Games", "Health & Wellness"], "name": "Active Lifestyle"},
}


IMAGE_KEYWORDS = {
    "Electronics":       "gadget",
    "Clothing":          "apparel",
    "Books":             "book",
    "Home & Kitchen":    "kitchen",
    "Sports & Outdoors": "sport",
    "Beauty":            "cosmetic",
    "Food & Beverages":  "food",
    "Toys & Games":      "toy",
    "Health & Wellness": "health",
    "Music":             "instrument",
    "Office Supplies":   "office",
    "Garden":            "garden",
}


def generate_products(n=1000):
    """Generate n products spread across categories."""
    products = []
    cats = list(CATEGORIES.keys())
    for i in range(1, n + 1):
        cat = cats[(i - 1) % len(cats)]
        brand = random.choice(CATEGORIES[cat])
        desc_base = random.choice(DESCRIPTIONS[cat])
        keyword = IMAGE_KEYWORDS.get(cat, "product")
        name = f"{brand} {cat.split('&')[0].strip()} {random.choice(['Pro', 'Plus', 'Elite', 'Basic', 'Max', 'Lite', 'Ultra', 'Classic'])} {i}"
        
        # Use loremflickr for category-specific placeholder images
        # We add the index to the URL to ensure different images for each product
        image_url = f"https://loremflickr.com/400/400/{keyword}?lock={i}"
        
        products.append({
            "id": i,
            "name": name,
            "category": cat,
            "brand": brand,
            "price": round(random.uniform(5.0, 500.0), 2),
            "description": f"{desc_base}. Model #{i} by {brand}.",
            "stock": random.randint(5, 200),
            "image_file": image_url,
        })
    return pd.DataFrame(products)


def generate_users(n=200):
    """Generate n users with taste cluster assignments and favourites."""
    first_names = ["Ahmed", "Sara", "Omar", "Mona", "Ali", "Fatima", "Hassan", "Nour",
                   "Youssef", "Layla", "Karim", "Hana", "Tarek", "Dina", "Mahmoud",
                   "Rania", "Khaled", "Amira", "Mostafa", "Salma", "Eyad", "Jana",
                   "Ayman", "Yasmin", "Hazem", "Mariam", "Wael", "Rana", "Sami", "Lina"]
    last_names = ["Mohamed", "Hassan", "Ali", "Ibrahim", "Saleh", "Ahmad", "Nasser",
                  "Khalil", "Mansour", "Farid", "Taha", "Younis", "Gamal", "Rashid"]

    users = []
    for i in range(1, n + 1):
        first = random.choice(first_names)
        last = random.choice(last_names)
        cluster = (i - 1) % 5
        role = "admin" if i <= 3 else "user"

        # Generate favourites: 5-15 products from preferred categories
        preferred_cats = CLUSTERS[cluster]["preferred"]
        all_product_ids = list(range(1, 1001))
        preferred_ids = [pid for pid in all_product_ids if ((pid - 1) % len(CATEGORIES.keys())) in
                         [list(CATEGORIES.keys()).index(c) for c in preferred_cats]]
        fav_ids = random.sample(preferred_ids, min(random.randint(5, 15), len(preferred_ids)))
        fav_str = ", ".join(str(fid) for fid in sorted(fav_ids))

        users.append({
            "id": i,
            "username": f"{first.lower()}_{last.lower()}_{i}",
            "full_name": f"{first} {last}",
            "email": f"user{i}@example.com",
            "password": f"Pass{i}word!",
            "role": role,
            "favourites": fav_str,
        })
    return pd.DataFrame(users)


def generate_ratings(n_users=200, n_products=1000, n_ratings=7000):
    """
    Generate ratings with taste cluster bias.
    Users rate preferred-category products higher (4-5) and others lower (1-3).
    """
    cats = list(CATEGORIES.keys())
    ratings = set()

    while len(ratings) < n_ratings:
        user_id = random.randint(1, n_users)
        product_id = random.randint(1, n_products)
        pair = (user_id, product_id)
        if pair in ratings:
            continue

        cluster = (user_id - 1) % 5
        preferred_cats = CLUSTERS[cluster]["preferred"]
        product_cat = cats[(product_id - 1) % len(cats)]

        if product_cat in preferred_cats:
            # Users rate preferred categories higher
            value = random.choices([3, 4, 5], weights=[15, 35, 50])[0]
        else:
            # Users rate non-preferred categories lower
            value = random.choices([1, 2, 3, 4], weights=[20, 30, 35, 15])[0]

        ratings.add(pair)

    rows = []
    for user_id, product_id in ratings:
        cluster = (user_id - 1) % 5
        preferred_cats = CLUSTERS[cluster]["preferred"]
        product_cat = cats[(product_id - 1) % len(cats)]

        if product_cat in preferred_cats:
            value = random.choices([3, 4, 5], weights=[15, 35, 50])[0]
        else:
            value = random.choices([1, 2, 3, 4], weights=[20, 30, 35, 15])[0]

        rows.append({"user_id": user_id, "product_id": product_id, "rating": value})

    return pd.DataFrame(rows)


def main():
    print("Generating sample data...")
    print(f"  Taste clusters: {', '.join(c['name'] for c in CLUSTERS.values())}")

    products_df = generate_products(1000)
    users_df = generate_users(200)
    ratings_df = generate_ratings(200, 1000, 7000)

    products_path = os.path.join(DATA_DIR, "products.xlsx")
    users_path = os.path.join(DATA_DIR, "users.xlsx")
    ratings_path = os.path.join(DATA_DIR, "ratings.xlsx")

    products_df.to_excel(products_path, index=False, engine="openpyxl")
    users_df.to_excel(users_path, index=False, engine="openpyxl")
    ratings_df.to_excel(ratings_path, index=False, engine="openpyxl")

    print(f"\n[OK] Generated:")
    print(f"   {products_path} -- {len(products_df)} products across {len(CATEGORIES)} categories")
    print(f"   {users_path}    -- {len(users_df)} users (3 admins, 197 users)")
    print(f"   {ratings_path}  -- {len(ratings_df)} ratings with cluster bias")
    print(f"\nAdmin credentials: username=ahmed_mohamed_1, password=Pass1word!")


if __name__ == "__main__":
    main()
