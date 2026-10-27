from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_resolve_pronoun_endpoint_basic(auth_headers):
    response = client.post(
        "/api/discourse/resolve-pronoun",
        json={"sentence": "John gave Ravi the book because he needed it.", "pronoun": "he"}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert len(body["candidates"]) > 0


def test_resolve_pronoun_endpoint_it_resolves_to_book(auth_headers):
    response = client.post(
        "/api/discourse/resolve-pronoun",
        json={"sentence": "John gave Ravi the book because he needed it.", "pronoun": "it"}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["resolved_antecedent"] == "the book"


def test_resolve_pronoun_endpoint_rejects_empty_sentence(auth_headers):
    response = client.post("/api/discourse/resolve-pronoun", json={"sentence": "", "pronoun": "he"}, headers=auth_headers)
    assert response.status_code == 422


def test_discourse_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/discourse/resolve-pronoun")
    assert response.status_code == 401
