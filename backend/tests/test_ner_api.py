import pytest
from fastapi.testclient import TestClient

from app.algorithms.ner_spacy import is_available as spacy_is_available
from app.main import app

client = TestClient(app)


def test_ner_endpoint_basic(auth_headers):
    r = client.post("/api/applications/ner", json={"text": "Google is based in California."}, headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    labels = {e["label"] for e in body["entities"]}
    assert "ORGANIZATION" in labels
    assert "LOCATION" in labels
    assert body["engine"] == "rule_based"  # the default when `engine` is omitted


def test_ner_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/applications/ner")
    assert response.status_code == 401


def test_ner_rejects_whitespace_only_text(auth_headers):
    r = client.post("/api/applications/ner", json={"text": "   \n  "}, headers=auth_headers)
    assert r.status_code == 422


def test_ner_rejects_unknown_engine(auth_headers):
    r = client.post(
        "/api/applications/ner", json={"text": "Hello there.", "engine": "not_a_real_engine"}, headers=auth_headers
    )
    assert r.status_code == 422


def test_ner_rule_based_engine_explicit(auth_headers):
    r = client.post(
        "/api/applications/ner", json={"text": "Mumbai University is great.", "engine": "rule_based"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["engine"] == "rule_based"



@pytest.mark.skipif(not spacy_is_available(), reason="spaCy / en_core_web_sm not installed in this environment.")
def test_ner_spacy_engine_end_to_end(auth_headers):
    # Real integration test through the actual HTTP layer, not a mock --
    # exercises request validation, the service layer's engine routing,
    # and the real spaCy model together.
    r = client.post(
        "/api/applications/ner",
        json={"text": "Microsoft opened a new office in Bengaluru.", "engine": "spacy"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["engine"] == "spacy"
    labels = {e["label"] for e in body["entities"]}
    assert "ORG" in labels
    # spaCy's own raw label set, not this project's rule-based taxonomy.
    assert set(body["supported_labels"]) >= {"PERSON", "ORG", "GPE"}
    for e in body["entities"]:
        assert body["text"][e["start"]:e["end"]] == e["text"]
