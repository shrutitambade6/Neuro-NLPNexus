import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UsernameAvailabilityResponse,
    UserOut,
    VerifyEmailResponse,
)
from app.services import birthday_service
from app.services.auth_service import (
    EmailNotVerifiedError,
    change_password,
    check_username_available,
    forgot_password,
    get_current_user,
    login_user,
    register_user,
    resend_verification_email,
    reset_password,
    verify_email,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    """Prefers X-Forwarded-For's first hop (this app may sit behind a
    reverse proxy in a real deployment) and falls back to the direct
    connection's address. Best-effort only — login_activity.ip_address is
    informational for the Security page, never used as an identity
    boundary by itself."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        return register_user(
            db, payload, ip_address=_client_ip(request), user_agent=request.headers.get("user-agent")
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/auth/username-available", response_model=UsernameAvailabilityResponse)
def username_available_endpoint(username: str, db: Session = Depends(get_db)) -> UsernameAvailabilityResponse:
    # Real-time signup availability check (spec section 1: "Show
    # real-time availability"). No auth required -- same privacy level
    # as the signup form itself, which anyone can already probe one
    # username at a time via a failed registration attempt.
    return UsernameAvailabilityResponse(available=check_username_available(db, username))


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        return login_user(
            db, payload, ip_address=_client_ip(request), user_agent=request.headers.get("user-agent")
        )
    except EmailNotVerifiedError as exc:
        # Production-Ready Email Verification milestone (2026-10-28). A
        # structured detail (not just a plain string) so the frontend can
        # reliably detect this one specific case -- via `code`, never by
        # pattern-matching the human-readable `message` -- and show a
        # "Resend verification email" action instead of a generic error.
        raise HTTPException(
            status_code=401, detail={"message": exc.message, "code": "email_not_verified"}
        ) from exc
    except ValueError as exc:
        # Super Admin Portal milestone: a rate-limited or suspended/
        # deactivated login still has to look like "login failed" to the
        # client, not a different status family — 401 for all of them,
        # same as a wrong password, so the Security page (not the login
        # form) is where these reasons actually surface.
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/auth/me", response_model=UserOut)
def me(authorization: str | None = Header(None), db: Session = Depends(get_db)) -> UserOut:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.removeprefix("Bearer ").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    # Birthday Experience milestone, point 4: "on every login/session" —
    # /auth/me is polled on every app load/refresh, so this is the other
    # half of that trigger alongside login_user's own call. Dedup'd per
    # recipient per day inside notify_relevant_users, so refreshing the
    # app repeatedly on your birthday never spams your friends/teachers.
    try:
        birthday_service.notify_relevant_users(db, user)
    except Exception:
        logger.exception("Birthday notification pass failed for user_id=%s", user.id)
    return UserOut.model_validate(user)


@router.get("/auth/verify-email", response_model=VerifyEmailResponse)
def verify_email_endpoint(token: str, db: Session = Depends(get_db)) -> VerifyEmailResponse:
    try:
        user = verify_email(db, token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return VerifyEmailResponse(verified=True, message="Your email has been verified.", user=UserOut.model_validate(user))


@router.post("/auth/resend-verification", response_model=ResendVerificationResponse)
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)) -> ResendVerificationResponse:
    return resend_verification_email(db, payload.email)


@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_endpoint(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    result = forgot_password(db, payload.email)
    return ForgotPasswordResponse(message=result.message)


@router.post("/auth/reset-password", response_model=ResetPasswordResponse)
def reset_password_endpoint(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> ResetPasswordResponse:
    try:
        return reset_password(db, payload.token, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/auth/change-password", response_model=ChangePasswordResponse)
def change_password_endpoint(
    payload: ChangePasswordRequest,
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> ChangePasswordResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header.")
    token = authorization.removeprefix("Bearer ").strip()
    user = get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    try:
        return change_password(db, user, payload.current_password, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
