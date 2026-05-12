"""Test with a NEW user who completed onboarding recently."""
from app.db import SessionLocal
from app.models import User, Rating
import traceback

db = SessionLocal()

# Find the most recent users (onboarding users)
recent_users = db.query(User).order_by(User.id.desc()).limit(5).all()
for u in recent_users:
    print(f"User {u.id}: {u.username}, onboarding={u.onboarding_completed}")
    n_ratings = db.query(Rating).filter(Rating.user_id == u.id).count()
    print(f"  Ratings count: {n_ratings}")

# Test with the most recent user
if recent_users:
    uid = recent_users[0].id
    print(f"\nTesting feed for user {uid} ({recent_users[0].username})")
    from app.services.rec_service import get_grouped_feed_recommendations
    try:
        result = get_grouped_feed_recommendations(uid, 10, db)
        print(f"Success! Got {len(result)} groups")
        for g in result:
            print(f"  {g['method_name']}: {len(g['products'])} products")
    except Exception as e:
        traceback.print_exc()

db.close()
