from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_sentiment_endpoint_basic(auth_headers):
    r = client.post("/api/applications/sentiment", json={"text": "I love this, it's fantastic!"}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "Positive"
    assert "matched_words" in body


def test_sentiment_endpoint_rejects_empty_text(auth_headers):
    r = client.post("/api/applications/sentiment", json={"text": ""}, headers=auth_headers)
    assert r.status_code == 422


def test_sentiment_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/applications/sentiment")
    assert response.status_code == 401
