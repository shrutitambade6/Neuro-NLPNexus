from fastapi.testclient import TestClient

from app.main import app
from app.services import auth_service
from tests.conftest import TestSessionLocal

# Isolated in-memory DB + get_db override + per-test create/drop all live in
# conftest.py now (shared across every test module that touches real data),
# so this file only needs the client and its own test functions.
client = TestClient(app)

# Username/Password Authentication milestone (2026-10-07) — signup/login no
# longer use email at all; see schemas.auth.RegisterRequest/LoginRequest and
# student-teacher-username-auth.md.


def _register(username: str, **overrides) -> "TestClient.post":
    payload = {
        "username": username,
        "full_name": "Test User",
        "college_email": f"{username.strip()}@vit.edu.in",
        "password": "hunter22pass",
        "confirm_password": "hunter22pass",
    }
    payload.update(overrides)
    return client.post("/api/auth/register", json=payload)


def _verify(username: str) -> None:
    """Completes the real verification flow for an already-registered
    account (Production-Ready Email Verification milestone, 2026-10-28),
    the same way a user's email link would -- a signed
    purpose=verify_email token, built exactly like
    test_email_verification_api.py's own pattern. Used by the tests below
    that need a genuinely-logged-in user and are not themselves testing
    the verification gate (those are covered by the dedicated tests at
    the bottom of this file)."""
    db = TestSessionLocal()
    try:
        user = db.query(auth_service.User).filter(auth_service.User.username == username.strip()).first()
        token = auth_service.create_access_token(
            {"sub": str(user.id), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
        )
    finally:
        db.close()
    resp = client.get("/api/auth/verify-email", params={"token": token})
    assert resp.status_code == 200, resp.text


def _register_and_login(username: str, password: str = "hunter22pass", **overrides) -> str:
    """Registers, completes verification, logs in, and returns a real
    access token -- for tests that need an authenticated user but are not
    themselves testing registration or the verification gate."""
    register_response = _register(username, password=password, confirm_password=password, **overrides)
    assert register_response.status_code == 201, register_response.text
    _verify(username)
    login_response = client.post("/api/auth/login", json={"username": username.strip(), "password": password})
    assert login_response.status_code == 200, login_response.text
    return login_response.json()["access_token"]


def test_register_creates_account_pending_verification():
    # Production-Ready Email Verification milestone (2026-10-28) --
    # deliberate, intentional rewrite of what this test used to assert.
    # It previously expected an immediate access_token and
    # is_verified=True right after registration; that was the bug this
    # milestone fixes (register_user hardcoded is_verified=True with a
    # stale comment). EMAIL_VERIFICATION_ENABLED defaults to "true" and
    # nothing overrides that in this test run, so the real, restored
    # behavior is: the account is created, but is unverified and gets NO
    # session token until it verifies.
    response = _register("shruti")
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["username"] == "shruti"
    assert body["user"]["full_name"] == "Test User"
    assert body["user"]["email"] == "shruti@vit.edu.in"
    assert body["user"]["is_verified"] is False
    assert body["access_token"] is None


def test_register_rejects_duplicate_username():
    _register("sameuser")
    response = _register("sameuser")
    assert response.status_code == 409


def test_register_rejects_duplicate_username_case_insensitively():
    _register("CaseUser")
    response = _register("caseuser")
    assert response.status_code == 409


def test_register_trims_whitespace_from_username():
    response = _register("  paddeduser  ")
    assert response.status_code == 201
    assert response.json()["user"]["username"] == "paddeduser"


def test_register_rejects_short_password():
    response = _register("shortpw", password="abc", confirm_password="abc")
    assert response.status_code == 422


def test_register_rejects_mismatched_passwords():
    response = _register("mismatch", password="hunter22pass", confirm_password="somethingelse")
    assert response.status_code == 422


def test_register_rejects_missing_full_name():
    response = client.post(
        "/api/auth/register",
        json={"username": "nofullname", "full_name": "", "password": "hunter22pass", "confirm_password": "hunter22pass"},
    )
    assert response.status_code == 422


def test_register_rejects_invalid_username_characters():
    response = _register("bad username!")
    assert response.status_code == 422


def test_username_available_for_unused_name():
    response = client.get("/api/auth/username-available", params={"username": "nobodyhasthis"})
    assert response.status_code == 200
    assert response.json()["available"] is True


def test_username_available_is_false_once_taken():
    _register("takenname")
    response = client.get("/api/auth/username-available", params={"username": "takenname"})
    assert response.status_code == 200
    assert response.json()["available"] is False


def test_username_available_is_case_insensitive():
    _register("CaseCheck")
    response = client.get("/api/auth/username-available", params={"username": "casecheck"})
    assert response.json()["available"] is False


def test_login_succeeds_with_correct_credentials_after_verification():
    _register("loginuser", password="correcthorse", confirm_password="correcthorse")
    _verify("loginuser")
    response = client.post("/api/auth/login", json={"username": "loginuser", "password": "correcthorse"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_succeeds_case_insensitively():
    _register("LoginCase", password="correcthorse", confirm_password="correcthorse")
    _verify("LoginCase")
    response = client.post("/api/auth/login", json={"username": "logincase", "password": "correcthorse"})
    assert response.status_code == 200


def test_login_rejects_wrong_password():
    _register("loginuser2", password="correcthorse", confirm_password="correcthorse")
    _verify("loginuser2")
    response = client.post("/api/auth/login", json={"username": "loginuser2", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect password."


def test_login_rejects_unknown_username():
    response = client.post("/api/auth/login", json={"username": "nobodyatall", "password": "whatever1"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Username not found."


def test_me_returns_current_user_with_valid_token():
    token = _register_and_login("meuser")
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "meuser"
    assert response.json()["email"] == "meuser@vit.edu.in"


def test_me_rejects_missing_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_rejects_invalid_token():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert response.status_code == 401


def test_change_password_succeeds_and_new_password_actually_works():
    token = _register_and_login("changepw1", password="originalpass1")

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "originalpass1", "new_password": "brandnewpass2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"]

    # Verify end-to-end, not just the 200 — the old password must now be
    # rejected and the new one must actually log in, exactly the standard
    # this project holds itself to for "the fix is real" (see
    # the Sign Up / is_verified debugging session this codebase went
    # through earlier).
    old_login = client.post("/api/auth/login", json={"username": "changepw1", "password": "originalpass1"})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", json={"username": "changepw1", "password": "brandnewpass2"})
    assert new_login.status_code == 200
    assert new_login.json()["access_token"]


def test_change_password_rejects_wrong_current_password():
    token = _register_and_login("changepw2", password="originalpass1")

    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "totallywrong", "new_password": "brandnewpass2"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400

    # The original password must still work — a rejected change-password
    # attempt must never have touched the real hash.
    still_works = client.post("/api/auth/login", json={"username": "changepw2", "password": "originalpass1"})
    assert still_works.status_code == 200


def test_change_password_requires_auth():
    response = client.post(
        "/api/auth/change-password",
        json={"current_password": "whatever1", "new_password": "brandnewpass2"},
    )
    assert response.status_code == 401


# Production-Ready Email Verification milestone (2026-10-28) -- the
# restored login gate, tested at the API layer. The underlying
# verify-email/resend mechanics themselves are tested in
# test_email_verification_api.py; these specifically cover register ->
# login interaction (blocked before verifying, allowed after) and the
# structured 401 the frontend relies on.


def test_login_blocked_before_verification_with_structured_error():
    _register("notverifiedyet", password="correcthorse", confirm_password="correcthorse")
    response = client.post("/api/auth/login", json={"username": "notverifiedyet", "password": "correcthorse"})
    assert response.status_code == 401
    detail = response.json()["detail"]
    # Structured, not a plain string -- the frontend keys off `code`,
    # never off matching the human-readable `message` text (see
    # app.api.auth's EmailNotVerifiedError handling).
    assert isinstance(detail, dict)
    assert detail["code"] == "email_not_verified"
    assert "verify" in detail["message"].lower()


def test_login_succeeds_after_verification():
    _register("verifiedlogin", password="correcthorse", confirm_password="correcthorse")
    unverified = client.post("/api/auth/login", json={"username": "verifiedlogin", "password": "correcthorse"})
    assert unverified.status_code == 401

    _verify("verifiedlogin")
    verified = client.post("/api/auth/login", json={"username": "verifiedlogin", "password": "correcthorse"})
    assert verified.status_code == 200
    assert verified.json()["access_token"]
    assert verified.json()["user"]["is_verified"] is True


def test_register_general_student_accepts_personal_gmail():
    # Production-Ready Email Verification milestone (2026-10-28) -- the
    # new General-student path (student_category="general"): a student
    # may register with a personal Gmail address instead of the
    # institutional domain.
    response = _register(
        "generalstudent",
        college_email="generalstudent@gmail.com",
        student_category="general",
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "generalstudent@gmail.com"


def test_register_general_student_rejects_non_gmail_personal_address():
    response = _register(
        "generalstudent2",
        college_email="generalstudent2@yahoo.com",
        student_category="general",
    )
    assert response.status_code == 422


def test_register_vit_student_still_rejects_personal_email():
    # Default student_category is "vit" -- unchanged behavior for anyone
    # who doesn't explicitly ask for the General path.
    response = _register("vitstudent", college_email="vitstudent@gmail.com")
    assert response.status_code == 422


def test_register_teacher_forced_onto_institutional_domain_even_if_general_requested():
    # The master requirement: teachers are ALWAYS forced server-side onto
    # the institutional domain, regardless of what student_category is
    # submitted (defense against a frontend-only restriction).
    response = _register(
        "teachertrygmail",
        college_email="teachertrygmail@gmail.com",
        account_type="teacher",
        student_category="general",
    )
    assert response.status_code == 422
