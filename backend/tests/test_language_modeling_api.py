from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CORPUS = [
    "the student learns nlp",
    "the student learns fast",
    "the teacher teaches nlp",
]


def test_ngrams_endpoint_basic(auth_headers):
    response = client.post("/api/lm/ngrams", json={"corpus": CORPUS, "n": 1}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["n"] == 1
    assert body["total_tokens"] == 12
    assert len(body["rows"]) > 0


def test_ngrams_endpoint_rejects_n_out_of_range(auth_headers):
    response = client.post("/api/lm/ngrams", json={"corpus": CORPUS, "n": 5}, headers=auth_headers)
    assert response.status_code == 422


def test_sentence_probability_endpoint_basic(auth_headers):
    response = client.post(
        "/api/lm/sentence-probability",
        json={"corpus": CORPUS, "sentence": "the student learns nlp", "n": 2, "smoothing": "none"}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["zero_probability"] is False
    assert body["perplexity"] is not None


def test_sentence_probability_endpoint_rejects_bad_smoothing(auth_headers):
    response = client.post(
        "/api/lm/sentence-probability",
        json={"corpus": CORPUS, "sentence": "the student learns nlp", "n": 2, "smoothing": "kneser-ney"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_perplexity_endpoint_basic(auth_headers):
    response = client.post("/api/lm/perplexity", json={"probability": 0.01, "n_words": 4}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["perplexity"] > 1


def test_perplexity_endpoint_rejects_probability_over_one(auth_headers):
    response = client.post("/api/lm/perplexity", json={"probability": 1.5, "n_words": 4}, headers=auth_headers)
    assert response.status_code == 422


def test_language_modeling_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/lm/ngrams")
    assert response.status_code == 401
