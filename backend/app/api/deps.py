"""
Shared FastAPI dependencies for routes that require an authenticated user.
Factors out the `_require_user`-style helper that app/api/challenges.py
defines locally, so progress.py and admin.py don't each duplicate it.
"""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.orm_models import User
from app.services.auth_service import get_current_user


def require_user(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in to continue — this is tied to your account.")
    token = authorization.removeprefix("Bearer ").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session — please sign in again.")
    return user


def require_admin(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    user = require_user(authorization, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="This area is restricted to the platform's admin account.")
    return user


def require_super_admin(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> User:
    """Super Admin Portal milestone. Deliberately its own role check, not
    `require_admin` with an "or" — role="admin" (Teacher) and
    role="super_admin" are different accounts with different, non-
    overlapping permissions (a Teacher never gets Super Admin access just
    by being an admin, and vice versa). Every /api/superadmin/* endpoint
    depends on this, so hiding a frontend route is never the only thing
    standing between a non-super-admin and this data."""
    user = require_user(authorization, db)
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="This area is restricted to the platform's Super Admin account.")
    return user
