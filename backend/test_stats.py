"""Quick test of the stats endpoint."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.db import SessionLocal
from app.routers.metrics import get_user_stats

class FakeAdmin:
    role = "admin"

db = SessionLocal()
try:
    result = get_user_stats(user_id=2, db=db, admin_user=FakeAdmin())
    print("SUCCESS!")
    print(f"User: {result['user']['username']}")
    print(f"Total Ratings: {result['total_ratings']}")
    print(f"Total Favourites: {result['total_favourites']}")
    print(f"Total Orders: {result['total_orders']}")
    print(f"Avg Rating: {result['avg_rating']}")
    print(f"Rating Distribution: {result['rating_distribution']}")
    print(f"Top Categories: {result['top_categories']}")
    print(f"Overlap Matrix rows: {len(result['overlap_matrix'])}")
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()
finally:
    db.close()
