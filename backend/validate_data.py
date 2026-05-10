import pandas as pd

print("=" * 60)
print("  DATASET VALIDATION REPORT")
print("=" * 60)

# === PRODUCTS ===
df = pd.read_excel('data/products.xlsx', engine='openpyxl')
print(f"\n[PRODUCTS] Rows: {len(df)}")
print(f"  Columns: {list(df.columns)}")
print(f"  Categories ({df['category'].nunique()}):")
for cat, cnt in df['category'].value_counts().items():
    print(f"    {cat}: {cnt}")
print(f"  Brands: {df['brand'].nunique()} unique")
print(f"  Price range: ${df['price'].min():.2f} - ${df['price'].max():.2f}")
desc_nulls = df['description'].isna().sum() if 'description' in df.columns else 'COLUMN MISSING'
img_nulls = df['image_file'].isna().sum() if 'image_file' in df.columns else 'COLUMN MISSING'
stock_nulls = df['stock'].isna().sum() if 'stock' in df.columns else 'COLUMN MISSING'
print(f"  Description empty/null: {desc_nulls}")
print(f"  image_file empty/null: {img_nulls}")
print(f"  stock empty/null: {stock_nulls}")
print(f"\n  Sample (first 2):")
print(df.head(2).to_string())

# === USERS ===
udf = pd.read_excel('data/users.xlsx', engine='openpyxl')
print(f"\n\n[USERS] Rows: {len(udf)}")
print(f"  Columns: {list(udf.columns)}")
admin_count = (udf['role'] == 'admin').sum() if 'role' in udf.columns else 'COLUMN MISSING'
print(f"  Admins: {admin_count}")
has_favs = 'favourites' in udf.columns
print(f"  Has 'favourites' column: {has_favs}")
if has_favs:
    fav_filled = udf['favourites'].notna().sum()
    print(f"  Users with favourites: {fav_filled}/{len(udf)}")
print(f"\n  Sample (first 2):")
print(udf.head(2).to_string())

# === RATINGS ===
rdf = pd.read_excel('data/ratings.xlsx', engine='openpyxl')
print(f"\n\n[RATINGS] Rows: {len(rdf)}")
print(f"  Columns: {list(rdf.columns)}")
print(f"  Rating distribution:")
for val in sorted(rdf['rating'].unique()):
    cnt = (rdf['rating'] == val).sum()
    pct = cnt / len(rdf) * 100
    print(f"    {val} stars: {cnt} ({pct:.1f}%)")
print(f"  Unique users: {rdf['user_id'].nunique()}")
print(f"  Unique products: {rdf['product_id'].nunique()}")
dupes = rdf.duplicated(subset=['user_id', 'product_id']).sum()
print(f"  Duplicate (user,product) pairs: {dupes}")
min_per_user = rdf.groupby('user_id').size().min()
max_per_user = rdf.groupby('user_id').size().max()
avg_per_user = rdf.groupby('user_id').size().mean()
print(f"  Ratings per user: min={min_per_user}, max={max_per_user}, avg={avg_per_user:.1f}")
min_per_prod = rdf.groupby('product_id').size().min()
products_with_0 = len(set(range(1, len(df)+1)) - set(rdf['product_id'].unique()))
print(f"  Min ratings per product: {min_per_prod}")
print(f"  Products with 0 ratings: {products_with_0}")

# === CROSS-REFERENCE VALIDATION ===
print(f"\n\n[VALIDATION]")
product_ids = set(df['id'])
user_ids = set(udf['id'])
invalid_user_refs = set(rdf['user_id']) - user_ids
invalid_prod_refs = set(rdf['product_id']) - product_ids
print(f"  Ratings referencing invalid user_id: {len(invalid_user_refs)}")
print(f"  Ratings referencing invalid product_id: {len(invalid_prod_refs)}")
if invalid_user_refs:
    print(f"    Bad user IDs: {sorted(invalid_user_refs)[:10]}")
if invalid_prod_refs:
    print(f"    Bad product IDs: {sorted(invalid_prod_refs)[:10]}")

print(f"\n{'=' * 60}")
if len(df) >= 500 and len(udf) >= 100 and len(rdf) >= 3000 and dupes == 0 and desc_nulls != 'COLUMN MISSING':
    print("  [OK] Dataset looks GOOD - ready to seed!")
    print(f"  Next step: py seed_from_excel.py")
else:
    print("  [WARNING] Issues found - review above")
print("=" * 60)
