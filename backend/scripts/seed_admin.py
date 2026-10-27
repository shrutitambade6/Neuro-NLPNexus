#!/usr/bin/env python3
"""
Seeds (or promotes) the ONE Teacher/Admin account for this platform.

There is deliberately no API endpoint that creates or promotes an admin —
/auth/register always creates role="student" accounts, and nothing lets a
signed-in student change their own role. The admin account only ever comes
from running this script directly against the backend's database, which is
what the spec means by "securely seeded/configured through the backend/
environment setup."

Usage (from backend/, with the project's venv active):

    python scripts/seed_admin.py --email teacher@example.com
    python scripts/seed_admin.py --email teacher@example.com --password "a specific password"
    python scripts/seed_admin.py --email teacher@example.com --reset-password

If --password is omitted, a strong random password is generated and
printed ONCE — it is never written to any file this script touches, and
it cannot be recovered later (only reset, with --reset-password).

Idempotent: running it again for the same email just confirms the account
is role="admin" (promoting it if it already existed as a student) without
touching its password, unless --reset-password is passed.
"""
import argparse
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.algorithms.auth import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine, ensure_additive_columns  # noqa: E402
from app.models import orm_models  # noqa: E402,F401
from app.models.orm_models import User  # noqa: E402


def _generate_password() -> str:
    # 18 bytes of real entropy, URL-safe-encoded — printed once, never
    # logged or persisted anywhere by this script.
    return secrets.token_urlsafe(18)


def _derive_username(email: str) -> str:
    base = email.split("@")[0]
    cleaned = "".join(c for c in base if c.isalnum() or c == "_") or "admin"
    return cleaned[:64]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="The admin account's email address.")
    parser.add_argument("--password", default=None, help="Set a specific password (otherwise one is generated).")
    parser.add_argument(
        "--reset-password", action="store_true", help="If the account already exists, reset its password too."
    )
    args = parser.parse_args()

    email = args.email.strip().lower()
    if "@" not in email:
        print(f"'{email}' doesn't look like a valid email address.", file=sys.stderr)
        return 1

    ensure_additive_columns(engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        password_to_report: str | None = None

        if user is None:
            password_to_report = args.password or _generate_password()
            username = _derive_username(email)
            # Guarantee uniqueness even if the derived username collides.
            suffix = 0
            candidate = username
            while db.query(User).filter(User.username == candidate).first() is not None:
                suffix += 1
                candidate = f"{username}{suffix}"
            user = User(
                username=candidate,
                email=email,
                password_hash=hash_password(password_to_report),
                role="admin",
                is_verified=True,
            )
            db.add(user)
            db.commit()
            print(f"Created new admin account: {email} (username: {candidate})")
        else:
            changed = []
            if user.role != "admin":
                user.role = "admin"
                changed.append("promoted to role=admin")
            if not user.is_verified:
                user.is_verified = True
                changed.append("marked verified")
            if args.password or args.reset_password:
                password_to_report = args.password or _generate_password()
                user.password_hash = hash_password(password_to_report)
                changed.append("password reset")
            db.commit()
            if changed:
                print(f"Updated existing account {email}: {', '.join(changed)}.")
            else:
                print(f"{email} is already an admin — nothing to change (use --reset-password to rotate its password).")

        if password_to_report:
            print("\n" + "=" * 60)
            print("ADMIN PASSWORD (save this now — it will not be shown again):")
            print(password_to_report)
            print("=" * 60)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
