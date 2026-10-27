from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_jaccard_endpoint(auth_headers):
    response = client.post("/api/semantics/jaccard", json={"set_a": ["nlp", "ai", "ml"], "set_b": ["ai", "ml", "dl"]}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["jaccard"] == 0.5


def test_cosine_endpoint_valid(auth_headers):
    response = client.post("/api/semantics/cosine", json={"vector_a": [1, 2, 3], "vector_b": [2, 4, 6]}, headers=auth_headers)
    assert response.status_code == 200


def test_cosine_endpoint_mismatched_length_returns_422(auth_headers):
    response = client.post("/api/semantics/cosine", json={"vector_a": [1, 2], "vector_b": [1, 2, 3]}, headers=auth_headers)
    assert response.status_code == 422


def test_tfidf_endpoint(auth_headers):
    response = client.post("/api/semantics/tfidf", json={"documents": ["I love NLP", "I love AI"]}, headers=auth_headers)
    assert response.status_code == 200
    assert "nlp" in response.json()["vocabulary"]


def test_wsd_endpoint_known_word(auth_headers):
    response = client.post("/api/semantics/wsd", json={"sentence": "The river bank was flooded.", "target_word": "bank"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["predicted_sense"] == "river_side"


def test_wsd_endpoint_unknown_word_honest(auth_headers):
    response = client.post("/api/semantics/wsd", json={"sentence": "Hello world", "target_word": "zzz"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert body["candidates"] == []


def test_jaccard_endpoint_rejects_empty_set(auth_headers):
    response = client.post("/api/semantics/jaccard", json={"set_a": [], "set_b": ["a"]}, headers=auth_headers)
    assert response.status_code == 422


def test_semantics_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/semantics/jaccard")
    assert response.status_code == 401
