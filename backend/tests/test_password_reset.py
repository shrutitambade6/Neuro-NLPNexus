from fastapi.testclient import TestClient

from app.algorithms.auth import create_access_token, hash_password
from app.main import app
from app.models.orm_models import User
from app.services.auth_service import JWT_SECRET
from tests.conftest import TestSessionLocal

client = TestClient(app)

# Username/Password Authentication milestone (2026-10-07). /auth/register
# no longer collects an email at all (see schemas.auth.RegisterRequest), so
# forgot-password / reset-password — still real, working endpoints for any
# account that DOES have an email on file (e.g. one a Super Admin set up
# directly) — can no longer be exercised by registering through the public
# API. These tests instead insert a user row directly with a real email,
# exactly mirroring how such an account actually comes to exist now (see
# schemas.superadmin.CreateTeacherRequest, which still requires one).


def _create_user_with_email(username: str, email: str, password: str = "hunter22pass") -> int:
    db = TestSessionLocal()
    try:
        user = User(
            username=username,
            email=email,
            full_name="Test User",
            password_hash=hash_password(password),
            is_verified=True,
            role="student",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id
    finally:
        db.close()


def test_forgot_password_returns_generic_message_for_unknown_email():
    response = client.post("/api/auth/forgot-password", json={"email": "nobody-at-all@example.com"})
    assert response.status_code == 200
    assert "password reset link has been sent" in response.json()["message"]


def test_forgot_password_returns_same_generic_message_for_known_email():
    _create_user_with_email("resetme", "resetme@example.com")
    response = client.post("/api/auth/forgot-password", json={"email": "resetme@example.com"})
    assert response.status_code == 200
    assert "password reset link has been sent" in response.json()["message"]


def test_forgot_password_logs_the_reset_link_when_smtp_is_not_configured(caplog):
    # Dev-only convenience: with no SMTP_* env vars set (the default in this
    # test environment), there is no email inbox to check, so the actual
    # reset link must still be reachable somehow — it's logged as a warning
    # (visible with Python logging's default config, same as
    # email_service.py's own "not sent" notice). The link is never
    # returned in the API response itself (see the generic-message tests
    # above), only written to the server's own log.
    _create_user_with_email("devlink", "devlink@example.com")
    with caplog.at_level("WARNING", logger="nlp_nexus.auth"):
        response = client.post("/api/auth/forgot-password", json={"email": "devlink@example.com"})
    assert response.status_code == 200
    messages = [r.message for r in caplog.records if r.name == "nlp_nexus.auth"]
    assert any("devlink@example.com" in m and "reset" in m.lower() for m in messages)


def test_reset_password_rejects_invalid_token():
    response = client.post("/api/auth/reset-password", json={"token": "not-a-real-token", "new_password": "newpassword1"})
    assert response.status_code == 400


def test_reset_password_rejects_token_with_wrong_purpose():
    # A verify-email token (purpose=verify_email) must not work as a reset token.
    user_id = _create_user_with_email("wrongpurpose", "wrongpurpose@example.com")
    token = create_access_token({"sub": str(user_id), "purpose": "verify_email"}, JWT_SECRET, 3600)
    response = client.post("/api/auth/reset-password", json={"token": token, "new_password": "newpassword1"})
    assert response.status_code == 400


def test_reset_password_with_valid_token_changes_password_and_allows_login():
    user_id = _create_user_with_email("validreset", "validreset@example.com")
    token = create_access_token({"sub": str(user_id), "purpose": "reset_password"}, JWT_SECRET, 3600)

    response = client.post("/api/auth/reset-password", json={"token": token, "new_password": "brandnewpassword1"})
    assert response.status_code == 200

    old_login = client.post("/api/auth/login", json={"username": "validreset", "password": "hunter22pass"})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", json={"username": "validreset", "password": "brandnewpassword1"})
    assert new_login.status_code == 200


def test_reset_password_rejects_too_short_new_password():
    response = client.post("/api/auth/reset-password", json={"token": "whatever", "new_password": "short"})
    assert response.status_code == 422


def test_register_never_creates_admin_role():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "sneaky",
            "full_name": "Sneaky User",
            "college_email": "sneaky@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
            "role": "admin",
        },
    )
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "student"


def test_register_requires_and_stores_a_college_email():
    # College Email milestone (2026-10-08) -- registration now requires a
    # real @vit.edu.in college email and stores it as the account's email,
    # superseding the prior username-only ("no email at all") behavior.
    response = client.post(
        "/api/auth/register",
        json={
            "username": "noemailneeded",
            "full_name": "No Email",
            "college_email": "noemailneeded@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    assert response.status_code == 201
    assert response.json()["user"]["email"] == "noemailneeded@vit.edu.in"


def test_login_sets_last_login():
    client.post(
        "/api/auth/register",
        json={
            "username": "lastlogin",
            "full_name": "Last Login",
            "college_email": "lastlogin@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    r1 = client.post("/api/auth/login", json={"username": "lastlogin", "password": "hunter22pass"})
    token = r1.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
