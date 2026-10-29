"""
Integration tests for the email-verification mechanics (originally
Milestone 18 — Account Creation & Email Verification).

Username/Password Authentication milestone (2026-10-07) changed what
registration itself does: /auth/register no longer collects or sends an
email at all, so every new account is active immediately (is_verified=True,
email_status="no_email") and there is nothing left to verify. The
/auth/verify-email and /auth/resend-verification endpoints themselves are
UNCHANGED and still real — they stay useful for any account that does have
an email on file (e.g. one a Super Admin created directly) — so this file
now tests registration's own honest "no_email" behavior directly, and tests
the verify/resend endpoints' mechanics against a user inserted straight
into the DB with a real email, the same way test_password_reset.py does.
"""
from fastapi.testclient import TestClient

from app.algorithms.auth import hash_password
from app.main import app
from app.models.orm_models import User
from app.services import auth_service
from tests.conftest import TestSessionLocal

client = TestClient(app)


def _create_user_with_email(username: str, email: str, is_verified: bool = False, password: str = "hunter22pass") -> int:
    db = TestSessionLocal()
    try:
        user = User(
            username=username,
            email=email,
            full_name="Test User",
            password_hash=hash_password(password),
            is_verified=is_verified,
            role="student",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def test_register_requires_verification_with_college_email_on_file():
    # Production-Ready Email Verification milestone (2026-10-28) --
    # deliberate, intentional rewrite. This test previously asserted that
    # registering with a real @vit.edu.in college email left the account
    # verified and logged in immediately; that was exactly the bug this
    # milestone fixes (register_user hardcoded is_verified=True with a
    # stale comment claiming no email was collected).
    # EMAIL_VERIFICATION_ENABLED defaults to "true" and nothing overrides
    # it in this test run, so the real, restored behavior is: the
    # account is created, unverified, and gets no session token until it
    # verifies.
    response = client.post(
        "/api/auth/register",
        json={
            "username": "verifyme",
            "full_name": "Verify Me",
            "college_email": "verifyme@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    assert response.status_code == 201
    body = response.json()
    # Registration itself must succeed regardless of email delivery outcome.
    # No SMTP is configured in this test environment, so the welcome-email
    # send is skipped and email_status comes back "not_configured" rather
    # than "sent" -- but registration itself is unaffected either way.
    assert body["access_token"] is None
    assert body["email_status"] == "not_configured"
    assert body["user"]["is_verified"] is False
    assert body["user"]["email"] == "verifyme@vit.edu.in"

    # And login is blocked until the real verify-email flow completes.
    blocked = client.post("/api/auth/login", json={"username": "verifyme", "password": "hunter22pass"})
    assert blocked.status_code == 401
    assert blocked.json()["detail"]["code"] == "email_not_verified"

    token = auth_service.create_access_token(
        {"sub": str(body["user"]["id"]), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
    )
    verify_resp = client.get("/api/auth/verify-email", params={"token": token})
    assert verify_resp.status_code == 200

    allowed = client.post("/api/auth/login", json={"username": "verifyme", "password": "hunter22pass"})
    assert allowed.status_code == 200
    assert allowed.json()["access_token"]


def test_login_response_has_no_email_status_once_verified():
    register = client.post(
        "/api/auth/register",
        json={
            "username": "loginonly",
            "full_name": "Login Only",
            "college_email": "loginonly@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    user_id = register.json()["user"]["id"]
    token = auth_service.create_access_token(
        {"sub": str(user_id), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
    )
    client.get("/api/auth/verify-email", params={"token": token})

    response = client.post("/api/auth/login", json={"username": "loginonly", "password": "hunter22pass"})
    assert response.status_code == 200
    assert response.json()["email_status"] is None


def test_verify_email_activates_account_with_valid_token():
    user_id = _create_user_with_email("tobeverified", "tobeverified@example.com", is_verified=False)
    token = auth_service.create_access_token(
        {"sub": str(user_id), "purpose": "verify_email"},
        auth_service.JWT_SECRET,
        3600,
    )

    response = client.get("/api/auth/verify-email", params={"token": token})
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["user"]["is_verified"] is True


def test_verify_email_rejects_garbage_token():
    response = client.get("/api/auth/verify-email", params={"token": "not.a.real.token"})
    assert response.status_code == 400


def test_verify_email_rejects_token_with_wrong_purpose():
    user_id = _create_user_with_email("wrongpurpose", "wrongpurpose@example.com", is_verified=False)
    # A login-style token (no purpose=verify_email) must not verify an account.
    token = auth_service.create_access_token({"sub": str(user_id), "username": "wrongpurpose"}, auth_service.JWT_SECRET, 3600)
    response = client.get("/api/auth/verify-email", params={"token": token})
    assert response.status_code == 400


def test_verify_email_rejects_expired_token():
    user_id = _create_user_with_email("expiredtok", "expiredtok@example.com", is_verified=False)
    token = auth_service.create_access_token(
        {"sub": str(user_id), "purpose": "verify_email"}, auth_service.JWT_SECRET, expires_in_seconds=-1
    )
    response = client.get("/api/auth/verify-email", params={"token": token})
    assert response.status_code == 400


def test_verify_email_is_idempotent_for_already_verified_account():
    user_id = _create_user_with_email("doubleverify", "doubleverify@example.com", is_verified=False)
    token = auth_service.create_access_token(
        {"sub": str(user_id), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
    )
    first = client.get("/api/auth/verify-email", params={"token": token})
    second = client.get("/api/auth/verify-email", params={"token": token})
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["user"]["is_verified"] is True


def test_resend_verification_for_unknown_email_does_not_leak_existence():
    response = client.post("/api/auth/resend-verification", json={"email": "ghost@example.com"})
    assert response.status_code == 200
    assert response.json()["email_status"] == "not_found"


def test_resend_verification_for_already_verified_account():
    _create_user_with_email("alreadyv", "alreadyv@example.com", is_verified=True)
    response = client.post("/api/auth/resend-verification", json={"email": "alreadyv@example.com"})
    assert response.status_code == 200
    assert response.json()["email_status"] == "already_verified"


def test_resend_verification_reports_not_configured_when_no_smtp(monkeypatch):
    for key in ("SENDGRID_API_KEY", "SMTP_FROM_EMAIL"):
        monkeypatch.delenv(key, raising=False)
    _create_user_with_email("resendme", "resendme@example.com", is_verified=False)
    response = client.post("/api/auth/resend-verification", json={"email": "resendme@example.com"})
    assert response.status_code == 200
    assert response.json()["email_status"] == "not_configured"


def test_resend_verification_is_rate_limited_on_quick_repeat():
    # Production-Ready Email Verification milestone (2026-10-28) -- the
    # new resend cooldown (User.last_verification_sent_at +
    # RESEND_VERIFICATION_COOLDOWN_SECONDS). No auth is required on this
    # endpoint, so without a cooldown anyone who knows an account's email
    # could make the platform repeatedly send to it.
    _create_user_with_email("cooldownme", "cooldownme@example.com", is_verified=False)
    first = client.post("/api/auth/resend-verification", json={"email": "cooldownme@example.com"})
    assert first.status_code == 200
    assert first.json()["email_status"] in ("not_configured", "sent")

    second = client.post("/api/auth/resend-verification", json={"email": "cooldownme@example.com"})
    assert second.status_code == 200
    assert second.json()["email_status"] == "rate_limited"
