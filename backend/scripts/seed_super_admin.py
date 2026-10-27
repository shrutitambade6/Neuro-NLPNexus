#!/usr/bin/env python3
"""
Seeds the ONE Super Admin account for this platform — a SEPARATE account
from the Teacher/Admin one seeded by scripts/seed_admin.py (role="admin").
role="super_admin" is its own, non-overlapping role: a Super Admin never
gets Teacher Dashboard access by being a Super Admin, and a Teacher never
gets Super Admin Portal access, however many teacher accounts exist.

There is deliberately no API endpoint that creates or promotes a Super
Admin — exactly like the Teacher/Admin account, it only ever comes from
running this script directly against the backend's database.

Usage (from backend/, with the project's venv active):

    python scripts/seed_super_admin.py --email root@example.com
    python scripts/seed_super_admin.py --email root@example.com --password "a specific password"
    python scripts/seed_super_admin.py --email root@example.com --reset-password

If --password is omitted, a strong random password is generated and
printed ONCE — it is never written to any file this script touches, and
it cannot be recovered later (only reset, with --reset-password).

Idempotent: running it again for the same email just confirms the account
is role="super_admin" (promoting it if it already existed as something
else) without touching its password, unless --reset-password is passed.
"""
import argparse
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.algorithms.auth import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine, ensure_additive_columns  # noqa: E402
from app.models import orm_models  # noqa: E402,F401
from app.models.orm_models import User  # noqa: E402


def _generate_password() -> str:
    return secrets.token_urlsafe(18)


def _derive_username(email: str) -> str:
    base = email.split("@")[0]
    cleaned = "".join(c for c in base if c.isalnum() or c == "_") or "superadmin"
    return cleaned[:64]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="The Super Admin account's email address.")
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
            suffix = 0
            candidate = username
            while db.query(User).filter(User.username == candidate).first() is not None:
                suffix += 1
                candidate = f"{username}{suffix}"
            user = User(
                username=candidate,
                email=email,
                password_hash=hash_password(password_to_report),
                role="super_admin",
                is_verified=True,
                account_status="active",
            )
            db.add(user)
            db.commit()
            print(f"Created new Super Admin account: {email} (username: {candidate})")
        else:
            if user.role == "admin":
                print(
                    f"Refusing: {email} is the platform's Teacher/Admin account. "
                    "The Super Admin account must be a separate email address.",
                    file=sys.stderr,
                )
                return 1
            changed = []
            if user.role != "super_admin":
                user.role = "super_admin"
                changed.append("promoted to role=super_admin")
            if user.account_status != "active":
                user.account_status = "active"
                changed.append("account_status reset to active")
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
                print(
                    f"{email} is already Super Admin — nothing to change "
                    "(use --reset-password to rotate its password)."
                )

        if password_to_report:
            print("\n" + "=" * 60)
            print("SUPER ADMIN PASSWORD (save this now — it will not be shown again):")
            print(password_to_report)
            print("=" * 60)
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
