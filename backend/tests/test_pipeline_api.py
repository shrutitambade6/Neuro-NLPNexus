from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_playground_run_endpoint_basic(auth_headers):
    response = client.post(
        "/api/playground/run",
        json={"text": "The Cats are Running", "tokenizer": "whitespace", "stages": ["lowercase", "stem"]}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["final_tokens"] == ["the", "cat", "ar", "run"]
    assert len(body["trace"]) == 3


def test_playground_run_endpoint_rejects_unknown_stage(auth_headers):
    response = client.post(
        "/api/playground/run",
        json={"text": "hello world", "tokenizer": "whitespace", "stages": ["not_a_stage"]}, headers=auth_headers
    )
    assert response.status_code == 422


def test_playground_compare_endpoint_basic(auth_headers):
    response = client.post(
        "/api/playground/compare",
        json={
            "text_a": "running fast",
            "text_b": "runs fast",
            "tokenizer": "whitespace",
            "stages": ["lowercase", "stem"],
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["jaccard"]["jaccard"] == 1.0


def test_pipeline_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/playground/run")
    assert response.status_code == 401
