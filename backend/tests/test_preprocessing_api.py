from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_tokenize_endpoint_returns_all_comparisons(auth_headers):
    response = client.post("/api/tokenize", json={"text": "The students are studying NLP."}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "whitespace" in body["tokens"]
    assert "rule_based" in body["tokens"]
    assert "regex" in body["tokens"]
    assert "sentences" in body["tokens"]
    assert body["token_counts"]["whitespace"] == 5


def test_tokenize_endpoint_rejects_empty_string(auth_headers):
    response = client.post("/api/tokenize", json={"text": ""}, headers=auth_headers)
    assert response.status_code == 422  # Pydantic min_length validation


def test_tokenize_endpoint_handles_long_input(auth_headers):
    long_text = "word " * 5000
    response = client.post("/api/tokenize", json={"text": long_text}, headers=auth_headers)
    assert response.status_code == 200


def test_preprocessing_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/tokenize")
    assert response.status_code == 401
