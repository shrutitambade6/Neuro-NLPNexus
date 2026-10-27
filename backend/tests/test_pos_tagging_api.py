from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_pos_tag_returns_full_pipeline_shape(auth_headers):
    response = client.post("/api/pos-tagging/tag", json={"sentence": "The dog runs quickly."}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()

    assert body["tokens"] == ["The", "dog", "runs", "quickly", "."]
    assert len(body["tag_set"]) == 11
    assert len(body["transition_matrix"]) == 11
    assert all(len(row) == 11 for row in body["transition_matrix"])
    assert len(body["trellis"]) == 5
    assert len(body["tagged"]) == 5
    assert body["best_path"] == ["DET", "NOUN", "VERB", "ADV", "PUNCT"]
    assert body["tagged"][0] == {"token": "The", "tag": "DET"}


def test_pos_tag_reports_unknown_tokens_honestly(auth_headers):
    response = client.post("/api/pos-tagging/tag", json={"sentence": "The zorbling sleeps."}, headers=auth_headers)
    body = response.json()
    assert "zorbling" in body["unknown_tokens"]
    zorbling_emission = next(e for e in body["token_emissions"] if e["token"] == "zorbling")
    assert zorbling_emission["is_known"] is False


def test_pos_tag_rejects_empty_sentence(auth_headers):
    response = client.post("/api/pos-tagging/tag", json={"sentence": ""}, headers=auth_headers)
    assert response.status_code == 422


def test_pos_tag_transition_matrix_rows_sum_to_one(auth_headers):
    response = client.post("/api/pos-tagging/tag", json={"sentence": "He is happy."}, headers=auth_headers)
    body = response.json()
    for row in body["transition_matrix"]:
        assert abs(sum(row) - 1.0) < 1e-3


def test_pos_tagging_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/pos-tagging/tag")
    assert response.status_code == 401
