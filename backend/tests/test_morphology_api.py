from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_morphology_endpoint_basic(auth_headers):
    response = client.post("/api/morphology/analyze", json={"words": ["running", "boxes", "unhappiness"]}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 3
    running = next(r for r in body["results"] if r["word"] == "running")
    assert running["stem"] == "run"
    assert running["lemma"] == "run"


def test_morphology_endpoint_rejects_all_blank(auth_headers):
    response = client.post("/api/morphology/analyze", json={"words": ["   ", ""]}, headers=auth_headers)
    assert response.status_code == 422


def test_morphology_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/morphology/analyze")
    assert response.status_code == 401
