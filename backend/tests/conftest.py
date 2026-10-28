"""
Shared test-suite fixtures. In particular, the isolated in-memory SQLite DB
+ get_db override used by any test that touches real persisted data (auth,
DL Challenges) lives here — a single shared engine/override, not one per
test file. FastAPI's dependency_overrides is a plain dict on the shared
`app` object, so if two test modules each called
`app.dependency_overrides[get_db] = ...` at import time, pytest's
collect-everything-before-running-anything behavior means whichever module
was imported last would silently win for every test in the whole suite —
including ones expecting the OTHER module's engine. Defining it once here
avoids that entirely.

StaticPool is required: without it, SQLite's `:memory:` gives each new
connection its own separate database, so two requests in the same test
(e.g. register() then login()) would silently hit two different empty
databases instead of sharing one.
"""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import orm_models  # noqa: F401 — registers models on Base

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def _override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)



def verify_and_login(client: TestClient, username: str, password: str = "hunter22pass") -> str:
    """Shared helper (Production-Ready Email Verification milestone,
    2026-10-28): completes the real verification flow for an
    already-registered, already-unverified account -- the same way a
    user's email link would, a signed purpose=verify_email token built
    exactly like test_email_verification_api.py's own pattern -- then
    logs in and returns a real access token.

    Dozens of test files across this suite have their own small
    `_register_and_token`-shaped helper that used to read
    `response.json()["access_token"]` straight off the register call.
    That stopped working once register_user stopped issuing a token for
    an unverified account (the real gate this milestone restores) --
    each of those helpers now calls this function instead of bypassing
    the gate, so every one of those ~90 tests still gets a REAL,
    genuinely-verified, logged-in user, not a shortcut around the new
    behavior they don't care about testing."""
    from app.services import auth_service

    db = TestSessionLocal()
    try:
        user = db.query(auth_service.User).filter(auth_service.User.username == username.strip()).first()
        token = auth_service.create_access_token(
            {"sub": str(user.id), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
        )
    finally:
        db.close()
    verify_resp = client.get("/api/auth/verify-email", params={"token": token})
    assert verify_resp.status_code == 200, verify_resp.text
    login_resp = client.post("/api/auth/login", json={"username": username.strip(), "password": password})
    assert login_resp.status_code == 200, login_resp.text
    return login_resp.json()["access_token"]


@pytest.fixture
def auth_headers(_fresh_test_db):
    """A ready-to-use Authorization header for a fresh, unique test user.

    Added for Task 1 ("fix authentication / protected content"): the ~29
    stateless NLP/DL lab-algorithm endpoints (tokenize, CNN forward, CYK
    parse, etc.) previously had no auth requirement at all — callable by
    anyone without logging in, matching nothing in the spec's "no content
    access without login" rule. They now depend on require_user, so their
    existing tests need a real bearer token. This fixture gives any test in
    the suite one, backed by a real registered account in the same test DB
    (not a fake/mocked token) — depends on _fresh_test_db explicitly so the
    tables exist before registering, regardless of fixture resolution order.
    """
    client = TestClient(app)
    # Username/Password Authentication milestone (2026-10-07) -- /auth/
    # register no longer accepts or needs an email; see
    # schemas.auth.RegisterRequest.
    username = f"apiuser_{uuid.uuid4().hex[:12]}"
    r = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "full_name": "Test User",
            "college_email": f"{username}@vit.edu.in",
            "password": "hunter22pass",
            "confirm_password": "hunter22pass",
        },
    )
    assert r.status_code == 201, r.text
    token = r.json().get("access_token")
    if not token:
        # Production-Ready Email Verification milestone (2026-10-28) --
        # registration no longer issues a session token for an account
        # that still needs to verify its email (EMAIL_VERIFICATION_ENABLED
        # defaults to "true", and nothing overrides that for this test
        # run). This fixture is plumbing for ~100 tests across the suite
        # that just need "a logged-in user" and have nothing to do with
        # verification itself, so it completes the SAME real verification
        # flow a user's email link would -- a signed purpose=verify_email
        # token, exactly like test_email_verification_api.py's own
        # pattern -- rather than bypassing the gate.
        from app.services import auth_service

        db = TestSessionLocal()
        try:
            user = db.query(auth_service.User).filter(auth_service.User.username == username).first()
            verify_token = auth_service.create_access_token(
                {"sub": str(user.id), "purpose": "verify_email"}, auth_service.JWT_SECRET, 3600
            )
        finally:
            db.close()
        verify_resp = client.get("/api/auth/verify-email", params={"token": verify_token})
        assert verify_resp.status_code == 200, verify_resp.text
        login_resp = client.post("/api/auth/login", json={"username": username, "password": "hunter22pass"})
        assert login_resp.status_code == 200, login_resp.text
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
