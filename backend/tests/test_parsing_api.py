from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_parse_cyk_accepts_valid_sentence(auth_headers):
    response = client.post("/api/parse/cyk", json={"sentence": "The students watch the movie."}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["tree"] is not None
    assert body["tree"]["symbol"] == "S"


def test_parse_cyk_reports_unknown_words_honestly(auth_headers):
    response = client.post("/api/parse/cyk", json={"sentence": "the students watch the spaceship"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "spaceship" in body["unknown_words"]
    assert body["accepted"] is False


def test_parse_cyk_rejects_empty_sentence(auth_headers):
    response = client.post("/api/parse/cyk", json={"sentence": ""}, headers=auth_headers)
    assert response.status_code == 422


def test_parse_cyk_case_insensitive(auth_headers):
    response = client.post("/api/parse/cyk", json={"sentence": "THE DOG SEES A CAT"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


def test_parse_top_down_accepts_valid_sentence(auth_headers):
    response = client.post("/api/parse/top-down", json={"sentence": "The students watch the movie."}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["tree"] is not None
    assert body["tree"]["symbol"] == "S"
    assert body["tree"]["rule"] == "S -> NP VP"
    assert body["steps"][0]["symbol"] == "S"


def test_parse_top_down_reports_unknown_words_honestly(auth_headers):
    response = client.post("/api/parse/top-down", json={"sentence": "the students watch the spaceship"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "spaceship" in body["unknown_words"]
    assert body["accepted"] is False


def test_parse_top_down_rejects_empty_sentence(auth_headers):
    response = client.post("/api/parse/top-down", json={"sentence": ""}, headers=auth_headers)
    assert response.status_code == 422


def test_parse_top_down_case_insensitive(auth_headers):
    response = client.post("/api/parse/top-down", json={"sentence": "THE DOG SEES A CAT"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["accepted"] is True


def test_parse_cyk_and_top_down_agree_on_same_sentence(auth_headers):
    """Both endpoints parse the same grammar and sentence — their accept/
    reject verdict must match, even though the algorithms are completely
    different (bottom-up chart vs top-down derivation)."""
    sentence = "A teacher likes a book."
    cyk_body = client.post("/api/parse/cyk", json={"sentence": sentence}, headers=auth_headers).json()
    td_body = client.post("/api/parse/top-down", json={"sentence": sentence}, headers=auth_headers).json()
    assert cyk_body["accepted"] == td_body["accepted"] == True
    assert cyk_body["tokens"] == td_body["tokens"]


def test_parsing_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/parse/cyk")
    assert response.status_code == 401
