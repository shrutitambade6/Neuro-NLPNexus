from fastapi.testclient import TestClient

from app.main import app

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


def test_register_creates_account_and_returns_token():
    response = _register("shruti")
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["username"] == "shruti"
    assert body["user"]["full_name"] == "Test User"
    assert body["user"]["email"] == "shruti@vit.edu.in"
    assert body["access_token"]
    assert body["token_type"] == "bearer"


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


def test_login_succeeds_with_correct_credentials():
    _register("loginuser", password="correcthorse", confirm_password="correcthorse")
    response = client.post("/api/auth/login", json={"username": "loginuser", "password": "correcthorse"})
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_login_succeeds_case_insensitively():
    _register("LoginCase", password="correcthorse", confirm_password="correcthorse")
    response = client.post("/api/auth/login", json={"username": "logincase", "password": "correcthorse"})
    assert response.status_code == 200


def test_login_rejects_wrong_password():
    _register("loginuser2", password="correcthorse", confirm_password="correcthorse")
    response = client.post("/api/auth/login", json={"username": "loginuser2", "password": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect password."


def test_login_rejects_unknown_username():
    response = client.post("/api/auth/login", json={"username": "nobodyatall", "password": "whatever1"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Username not found."


def test_me_returns_current_user_with_valid_token():
    register = _register("meuser")
    token = register.json()["access_token"]
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
    register = _register("changepw1", password="originalpass1", confirm_password="originalpass1")
    token = register.json()["access_token"]

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
    register = _register("changepw2", password="originalpass1", confirm_password="originalpass1")
    token = register.json()["access_token"]

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
