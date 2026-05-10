"""
CLI commands for admin management and metrics computation.
Usage:
  python -m app.cli create-admin <username> <password>
  python -m app.cli compute-metrics
"""
import sys
import argparse

from app.db import SessionLocal, engine, Base
from app.models import User
from app.security import hash_password


def create_admin(username: str, password: str) -> None:
    """Create an admin user. Exits with error if username already exists."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        username_lower = username.lower()

        # Check if user already exists
        existing = db.query(User).filter(User.username == username_lower).first()
        if existing:
            print(f"Error: User '{username_lower}' already exists.", file=sys.stderr)
            sys.exit(1)

        user = User(
            full_name=f"Admin {username_lower}",
            username=username_lower,
            email=f"{username_lower}@admin.local",
            password_hash=hash_password(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"Admin user '{username_lower}' created successfully.")
    finally:
        db.close()


def compute_metrics() -> None:
    """Compute and store metrics snapshot."""
    # This will be implemented when the eval_service is wired up (H1)
    print("Metrics computation not yet implemented.")
    sys.exit(0)


def main():
    parser = argparse.ArgumentParser(description="E-Commerce Rec System CLI")
    subparsers = parser.add_subparsers(dest="command")

    # create-admin
    admin_parser = subparsers.add_parser("create-admin", help="Create an admin user")
    admin_parser.add_argument("username", type=str)
    admin_parser.add_argument("password", type=str)

    # compute-metrics
    subparsers.add_parser("compute-metrics", help="Compute global metrics snapshot")

    args = parser.parse_args()

    if args.command == "create-admin":
        create_admin(args.username, args.password)
    elif args.command == "compute-metrics":
        compute_metrics()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
