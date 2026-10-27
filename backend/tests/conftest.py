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
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
