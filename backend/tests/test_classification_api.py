from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_classify_endpoint_basic(auth_headers):
    r = client.post("/api/applications/classify", json={"text": "the senator proposed a new bill"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["predicted_category"] == "Politics"


def test_classification_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/applications/classify")
    assert response.status_code == 401
