from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TEXT = (
    "NLP is a broad field. It includes tokenization and parsing. "
    "It also includes semantics and discourse. This app teaches all of it."
)


def test_summarize_endpoint_basic(auth_headers):
    r = client.post("/api/applications/summarize", json={"text": TEXT, "n_sentences": 2}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["summary_sentence_count"] == 2


def test_summarize_endpoint_default_n_sentences(auth_headers):
    r = client.post("/api/applications/summarize", json={"text": TEXT}, headers=auth_headers)
    assert r.status_code == 200


def test_summarization_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/applications/summarize")
    assert response.status_code == 401
