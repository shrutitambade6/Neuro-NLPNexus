from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "nlp-nexus-backend"


def test_health_check_reports_real_database_connectivity():
    # Added for the "Couldn't reach the backend" debugging pass: /api/health
    # now actually runs a trivial query against the real DB session rather
    # than just reporting the HTTP layer is up, so a frontend/backend
    # failure and a backend/database failure don't both just look like
    # "API offline" to whoever is debugging.
    response = client.get("/api/health")
    body = response.json()
    assert body["database"] == "connected"


def test_root_returns_running_status():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"
