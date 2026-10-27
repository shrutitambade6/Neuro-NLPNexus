import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.algorithms.auth import create_access_token, decode_access_token, hash_password, verify_password
from app.algorithms.email_templates import PLATFORM_NAME, build_account_created_email, build_password_reset_email
from app.algorithms.security_policy import (
    ACCOUNT_STATUS_LOGIN_MESSAGES,
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    SUPER_ADMIN_SESSION_LIFETIME_SECONDS,
)
from app.models.orm_models import LoginActivity, User, UserSession
from app.services import birthday_service
from app.schemas.auth import (
    ChangePasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResendVerificationResponse,
    ResetPasswordResponse,
    TokenResponse,
    UserOut,
)
from app.services.email_service import EmailSendResult, send_email

# Dev-only fallback secret — MUST be overridden via the JWT_SECRET env var
# before any real deployment. Flagged here rather than silently shipping an
# insecure default with no warning.
logger = logging.getLogger("nlp_nexus.auth")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
TOKEN_EXPIRES_SECONDS = 60 * 60 * 24  # 24 hours
VERIFY_TOKEN_EXPIRES_SECONDS = 60 * 60 * 24  # verification link is valid for 24 hours
VERIFY_TOKEN_PURPOSE = "verify_email"
RESET_TOKEN_EXPIRES_SECONDS = 60 * 60  # password reset link is valid for 1 hour
RESET_TOKEN_PURPOSE = "reset_password"

# Milestone 18 — Account Creation & Email Verification, read fresh from the
# environment at call time (not module import time) so tests can flip them
# with monkeypatch without reimporting this module.


def _email_verification_enabled() -> bool:
    return os.getenv("EMAIL_VERIFICATION_ENABLED", "true").strip().lower() != "false"


def _frontend_base_url() -> str:
    return os.getenv("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")


def _support_contact() -> str:
    return os.getenv("SUPPORT_EMAIL", "").strip() or "your platform administrator"


def _issue_token(
    db: Session,
    user: User,
    email_status: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TokenResponse:
    """Issues a signed access token AND a matching UserSession row, keyed
    by a random `jti` embedded in the token. The UserSession row is what
    makes the Super Admin's "active sessions" list and "revoke this
    session" action real — see get_current_user below, which checks it on
    every request, and superadmin_service.revoke_session / status changes,
    which mark rows here revoked.

    A super_admin account gets a much shorter-lived token
    (SUPER_ADMIN_SESSION_LIFETIME_SECONDS) than everyone else
    (TOKEN_EXPIRES_SECONDS) — see security_policy.py. Every other role is
    unaffected."""
    lifetime_seconds = SUPER_ADMIN_SESSION_LIFETIME_SECONDS if user.role == "super_admin" else TOKEN_EXPIRES_SECONDS
    jti = secrets.token_urlsafe(24)
    # Username/Password Authentication milestone (2026-10-07) — the token
    # used to carry the account's email as a claim; it now carries the
    # username instead, since that's the real identity going forward and
    # email is frequently absent (None) now.
    token = create_access_token(
        {"sub": str(user.id), "username": user.username, "jti": jti}, JWT_SECRET, lifetime_seconds
    )
    session = UserSession(
        user_id=user.id,
        jti=jti,
        ip_address=(ip_address or None),
        user_agent=((user_agent or "")[:255] or None),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=lifetime_seconds),
    )
    db.add(session)
    db.commit()
    return TokenResponse(access_token=token, user=UserOut.model_validate(user), email_status=email_status)


def _log_login_attempt(
    db: Session,
    *,
    user_id: int | None,
    email_attempted: str,
    success: bool,
    failure_reason: str | None,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    # Username/Password Authentication milestone (2026-10-07) — the
    # LoginActivity.email_attempted column keeps its original name (a
    # rename would need the same kind of table-rebuild migration as
    # database.ensure_email_nullable, for a column that's purely an
    # internal audit-log field no API response labels "email" anymore —
    # see schemas/superadmin.py's own comment on LoginActivityOut), but it
    # now stores the attempted USERNAME, not an email address. Parameter
    # name kept as `email_attempted` to match the column/model field.
    db.add(
        LoginActivity(
            user_id=user_id,
            email_attempted=email_attempted,
            success=success,
            failure_reason=failure_reason,
            ip_address=ip_address,
            user_agent=(user_agent or "")[:255] or None,
        )
    )
    db.commit()


def _recent_failed_login_count(db: Session, username: str) -> int:
    window_start = datetime.now(timezone.utc) - timedelta(seconds=LOGIN_RATE_LIMIT_WINDOW_SECONDS)
    return (
        db.query(LoginActivity)
        .filter(
            LoginActivity.email_attempted == username,
            LoginActivity.success.is_(False),
            LoginActivity.created_at >= window_start,
        )
        .count()
    )


def _build_verify_url(user: User) -> str:
    token = create_access_token(
        {"sub": str(user.id), "purpose": VERIFY_TOKEN_PURPOSE},
        JWT_SECRET,
        VERIFY_TOKEN_EXPIRES_SECONDS,
    )
    return f"{_frontend_base_url()}/verify-email?token={token}"


def _send_account_created_email(user: User) -> str:
    """Builds and sends the welcome email, and returns an honest
    email_status string. Never raises — a failed or skipped send must not
    prevent account creation from succeeding (the user's own spec: 'handle
    email delivery failures gracefully').

    Username/Password Authentication milestone (2026-10-07) -- a normal
    signup no longer collects an email at all, so this is skipped
    entirely (no SMTP attempt, honest "no_email" status) for the common
    case now. Still exercised for the rare account that does have an
    email (e.g. created directly by a Super Admin)."""
    if not user.email:
        return "no_email"

    verification_enabled = _email_verification_enabled()
    verify_url = _build_verify_url(user) if verification_enabled else None

    subject, html_body, text_body = build_account_created_email(
        username=user.username,
        email=user.email,
        created_at=user.created_at or datetime.now(timezone.utc),
        verify_url=verify_url,
        support_contact=_support_contact(),
    )

    try:
        result: EmailSendResult = send_email(user.email, subject, html_body, text_body)
    except Exception:  # noqa: BLE001 — send_email already catches SMTP errors; this is a last resort
        return "smtp_error"
    return "sent" if result.sent else (result.reason or "smtp_error")


def register_user(
    db: Session,
    payload: RegisterRequest,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TokenResponse:
    # Username/Password Authentication milestone (2026-10-07). Username
    # uniqueness is now the ONLY uniqueness check here (no email to check
    # — signup never collects one). Case-insensitive, and the username
    # was already trimmed by RegisterRequest's own validator.
    if db.query(User).filter(func.lower(User.username) == payload.username.lower()).first():
        raise ValueError("That username is already taken.")

    # College-email requirement (2026-10-08). payload.college_email is
    # already lowercased + domain-validated by RegisterRequest itself --
    # this is just the uniqueness check, same pattern as username above,
    # so two accounts can never share one institutional email.
    if db.query(User).filter(func.lower(User.email) == payload.college_email).first():
        raise ValueError("An account with that college email already exists.")

    user = User(
        username=payload.username,
        full_name=payload.full_name,
        email=payload.college_email,
        password_hash=hash_password(payload.password),
        # No email collected at signup anymore, so there is nothing to
        # verify — every new account is active immediately. The old
        # "not _email_verification_enabled()" logic only ever mattered
        # when email verification was the gate; that gate no longer
        # applies to the normal signup path at all.
        is_verified=True,
        # Hardcoded, not read from the request — RegisterRequest has no
        # role field at all, so public sign-up can never create an admin
        # account. The one admin account only ever comes from
        # backend/scripts/seed_admin.py, and the one Super Admin account
        # only ever comes from backend/scripts/seed_super_admin.py.
        role="student",
        # Student/Teacher self-serve signup follow-up (2026-10-07) — role
        # itself stays hardcoded "student" above, unconditionally, same
        # security boundary as before this existed. Picking "Teacher" only
        # ever flips this flag; see User.teacher_request_pending and
        # superadmin_service.approve_teacher_request for what actually
        # grants role="admin".
        teacher_request_pending=payload.account_type == "teacher",
        # Birthday Experience milestone — both optional; see RegisterRequest.
        birthday=payload.birthday,
        timezone=payload.timezone or "UTC",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    email_status = _send_account_created_email(user)
    return _issue_token(db, user, email_status=email_status, ip_address=ip_address, user_agent=user_agent)


def check_username_available(db: Session, username: str) -> bool:
    """Real-time signup availability check (spec section 1). Same
    case-insensitive, trimmed comparison register_user itself uses, so
    this can never say "available" for a username registration would
    then reject."""
    trimmed = username.strip()
    if not trimmed or not re.match(r"^[A-Za-z0-9_]+$", trimmed):
        return False
    exists = db.query(User).filter(func.lower(User.username) == trimmed.lower()).first() is not None
    return not exists


# Student/Teacher self-serve signup follow-up (2026-10-07). "Teacher" at
# sign-in matches role="admin" (what this codebase actually calls a
# Teacher account -- see User.role's own comment) AND role="super_admin",
# since the one Super Admin account is "staff," not a student, and there
# is no separate third tab for it on the login page. Deliberately a plain
# function, not a dict literal with a stray trailing None, so a typo'd
# account_type fails loudly instead of silently matching nothing.
_TEACHER_LOGIN_ROLES = ("admin", "super_admin")
_ACCOUNT_TYPE_MISMATCH_MESSAGES = {
    "student": 'This account is a teacher account, not a student account. Select "Teacher" and try again.',
    "teacher": 'This account is a student account, not a teacher account. Select "Student" and try again.',
}


def _account_type_matches(role: str, account_type: str) -> bool:
    if account_type == "student":
        return role == "student"
    if account_type == "teacher":
        return role in _TEACHER_LOGIN_ROLES
    return True


def login_user(
    db: Session,
    payload: LoginRequest,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> TokenResponse:
    # Username/Password Authentication milestone (2026-10-07). Login is
    # now by username, not email — see schemas.auth.LoginRequest. Case-
    # insensitive, trimmed, same normalization register_user's own
    # uniqueness check uses.
    username = payload.username.strip().lower()

    # DB-backed login rate limit (Super Admin Portal milestone) — counts
    # recent FAILED attempts for this username, same "survive a restart"
    # reasoning as the chat/community rate limiter. A locked-out attempt
    # is itself logged as a failure (failure_reason="rate_limited") so it
    # shows up honestly in the Security page rather than disappearing.
    if _recent_failed_login_count(db, username) >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS:
        _log_login_attempt(
            db,
            user_id=None,
            email_attempted=username,
            success=False,
            failure_reason="rate_limited",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise ValueError("Too many failed login attempts. Please try again in a few minutes.")

    user = db.query(User).filter(func.lower(User.username) == username).first()
    if not user:
        _log_login_attempt(
            db,
            user_id=None,
            email_attempted=username,
            success=False,
            failure_reason="bad_credentials",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        # Username/Password Authentication milestone (2026-10-07) --
        # deliberately a DIFFERENT message than a wrong password (spec's
        # own explicit requirement: "Username not found." vs. "Incorrect
        # password."). This is a real change from this codebase's
        # previous anti-enumeration stance (login_user used to say
        # "Incorrect email or password" either way, and forgot_password /
        # resend_verification_email still do) -- usernames are a public,
        # chosen handle here (visible throughout the Community/Chat
        # features), not a secret the way an email address was treated,
        # so revealing "not found" for one is a deliberate, spec-directed
        # trade-off, not an oversight.
        raise ValueError("Username not found.")

    if not verify_password(payload.password, user.password_hash):
        _log_login_attempt(
            db,
            user_id=user.id,
            email_attempted=username,
            success=False,
            failure_reason="bad_credentials",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise ValueError("Incorrect password.")

    if user.account_status != "active":
        _log_login_attempt(
            db,
            user_id=user.id,
            email_attempted=username,
            success=False,
            failure_reason=f"account_{user.account_status}",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise ValueError(ACCOUNT_STATUS_LOGIN_MESSAGES.get(user.account_status, "This account is not active."))

    # Student/Teacher self-serve signup follow-up (2026-10-07). Checked
    # only after credentials + account_status both pass, so a mismatch
    # here never leaks anything about whether an email/password pair was
    # valid -- it's purely "you authenticated correctly, but picked the
    # wrong tab." `account_type` is optional on LoginRequest, so a caller
    # that never sends it (there's none in this app, but kept honest for
    # any other client) skips this check entirely.
    if payload.account_type and not _account_type_matches(user.role, payload.account_type):
        _log_login_attempt(
            db,
            user_id=user.id,
            email_attempted=username,
            success=False,
            failure_reason="account_type_mismatch",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        raise ValueError(_ACCOUNT_TYPE_MISMATCH_MESSAGES[payload.account_type])

    # Real, persisted "last_login" — what the admin dashboard's "active
    # students" figure and each student row's "last activity" are computed
    # from (see app/services/admin_service.py).
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    _log_login_attempt(
        db, user_id=user.id, email_attempted=username, success=True, failure_reason=None,
        ip_address=ip_address, user_agent=user_agent,
    )
    # Birthday Experience milestone, point 4: "on every login/session,
    # determine whether today matches the user's birthday." This is that
    # check — real login, not a cron job. Notifying friends/teachers is
    # dedup'd per recipient per day inside notify_relevant_users itself
    # (point 20), so logging in five times on your birthday never sends a
    # friend five copies of the same notification. Failure here (e.g. a
    # transient DB hiccup) must never block a real login.
    try:
        birthday_service.notify_relevant_users(db, user)
    except Exception:
        logger.exception("Birthday notification pass failed for user_id=%s", user.id)
    return _issue_token(db, user, ip_address=ip_address, user_agent=user_agent)


def get_current_user(db: Session, token: str) -> User | None:
    payload = decode_access_token(token, JWT_SECRET)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except (TypeError, ValueError):
        return None
    if not user or user.account_status != "active":
        return None
    # Session-revocation check (Super Admin Portal milestone). `jti` is
    # absent on tokens issued before this milestone shipped — those keep
    # working unchanged (no session row to check against) until they
    # naturally expire; every token issued from now on carries one.
    jti = payload.get("jti")
    if jti:
        session = db.query(UserSession).filter(UserSession.jti == jti).first()
        if session is not None and session.revoked_at is not None:
            return None
    return user


def verify_email(db: Session, token: str) -> User:
    """Decodes a verify-email token and marks the matching user verified.
    Raises ValueError (caller maps to a 4xx) for any invalid, expired, or
    wrong-purpose token, or a user that no longer exists."""
    payload = decode_access_token(token, JWT_SECRET)
    if not payload or payload.get("purpose") != VERIFY_TOKEN_PURPOSE:
        raise ValueError("This verification link is invalid or has expired.")

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise ValueError("This verification link is invalid or has expired.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("This verification link is invalid or has expired.")

    if not user.is_verified:
        user.is_verified = True
        db.commit()
        db.refresh(user)
    return user


def resend_verification_email(db: Session, email: str) -> ResendVerificationResponse:
    user = db.query(User).filter(User.email == email.lower()).first()
    # Deliberately do not reveal whether the account exists — same response
    # shape either way, matching the earlier `login`-style honesty about
    # not leaking account existence through response differences alone
    # (the message here is generic; a real product would also rate-limit
    # this endpoint, which is out of scope for this project).
    if not user:
        return ResendVerificationResponse(
            email_status="not_found",
            message="If that email has an account, a verification email has been sent.",
        )
    if user.is_verified:
        return ResendVerificationResponse(email_status="already_verified", message="This account is already verified.")
    if not _email_verification_enabled():
        return ResendVerificationResponse(
            email_status="disabled", message="Email verification is currently disabled for this platform."
        )

    status = _send_account_created_email(user)
    message = (
        f"A new verification email was sent to {user.email}."
        if status == "sent"
        else "The verification email could not be delivered right now — the platform's email service isn't "
        "configured. Please contact " + _support_contact() + "."
    )
    return ResendVerificationResponse(email_status=status, message=message)


def _build_reset_url(user: User) -> str:
    token = create_access_token(
        {"sub": str(user.id), "purpose": RESET_TOKEN_PURPOSE},
        JWT_SECRET,
        RESET_TOKEN_EXPIRES_SECONDS,
    )
    return f"{_frontend_base_url()}/reset-password?token={token}"


def forgot_password(db: Session, email: str) -> ResetPasswordResponse:
    """Always returns the same generic message whether or not the account
    exists (same honesty-about-not-leaking-existence pattern as
    resend_verification_email) — only the side effect (an email going out)
    differs, never the response shape."""
    generic = ResetPasswordResponse(
        message="If that email has an account, a password reset link has been sent."
    )
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        return generic

    reset_url = _build_reset_url(user)
    subject, html_body, text_body = build_password_reset_email(
        username=user.username, reset_url=reset_url, support_contact=_support_contact()
    )
    try:
        result = send_email(user.email, subject, html_body, text_body)
        # Local-dev convenience ONLY: when SMTP genuinely isn't configured
        # (email_service.send_email's "not_configured" path — never when a
        # real send was attempted and failed), there is no other way for
        # whoever is running this locally to actually get the reset link,
        # so it's logged here at INFO level. This never fires once real
        # SMTP_* env vars are set, so it never reaches a real deployment's
        # logs — the link still never appears in any API response.
        if not result.sent and result.reason == "not_configured":
            logger.warning("[dev only] Password reset link for %s: %s", user.email, reset_url)
    except Exception:  # noqa: BLE001 — never let a failed send surface account existence or break the flow
        pass
    return generic


def reset_password(db: Session, token: str, new_password: str) -> ResetPasswordResponse:
    payload = decode_access_token(token, JWT_SECRET)
    if not payload or payload.get("purpose") != RESET_TOKEN_PURPOSE:
        raise ValueError("This password reset link is invalid or has expired.")

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise ValueError("This password reset link is invalid or has expired.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("This password reset link is invalid or has expired.")

    user.password_hash = hash_password(new_password)
    # Revoke every currently-active session for this account — a password
    # reset should also end any session that might have been started
    # under the OLD password (e.g. on a device the user no longer trusts),
    # not just change what future logins require. Same table the Super
    # Admin's "revoke session" action writes to (see UserSession).
    db.query(UserSession).filter(
        UserSession.user_id == user.id, UserSession.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()
    return ResetPasswordResponse(message="Your password has been reset. You can now sign in with your new password.")


def change_password(db: Session, user: User, current_password: str, new_password: str) -> ChangePasswordResponse:
    """Settings page's "Account & Security" change-password action. Unlike
    reset_password (unauthenticated, reached via an emailed token), this
    requires the caller to already be signed in AND to prove they know the
    real current password — verified against the real stored hash, not
    trusted from the client. Never a no-op success: a wrong current
    password always raises, and the caller (api/auth.py) maps that to a
    real 400, not a fake 200."""
    if not verify_password(current_password, user.password_hash):
        raise ValueError("Your current password is incorrect.")
    user.password_hash = hash_password(new_password)
    db.commit()
    return ChangePasswordResponse(message="Your password has been changed.")


__all__ = [
    "PLATFORM_NAME",
    "register_user",
    "login_user",
    "get_current_user",
    "verify_email",
    "resend_verification_email",
    "forgot_password",
    "reset_password",
    "change_password",
]
