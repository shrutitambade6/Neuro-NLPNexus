from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_CODE = "doc = nlp(text)\nfor ent in doc.ents:\n    print(ent.text, ent.label_)\n"
SAMPLE_TEXT = "Google is based in California."


def test_playground_run_rejects_anonymous_requests():
    r = client.post("/api/applications/ner-playground/run", json={"code": VALID_CODE, "text": SAMPLE_TEXT})
    assert r.status_code == 401


def test_playground_run_end_to_end_through_http(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": VALID_CODE, "text": SAMPLE_TEXT, "engine": "rule_based"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["engine"] == "rule_based"
    assert isinstance(body["entities"], list)
    assert isinstance(body["events"], list)
    assert body["events"][0]["kind"] == "started"


def test_playground_run_rejects_blank_code(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": "   ", "text": SAMPLE_TEXT},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_playground_run_rejects_blank_text(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": VALID_CODE, "text": "   "},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_playground_run_rejects_oversized_code(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": "x" * 8001, "text": SAMPLE_TEXT},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_playground_run_rejects_unknown_engine(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": VALID_CODE, "text": SAMPLE_TEXT, "engine": "not_a_real_engine"},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_playground_run_reports_syntax_errors_through_http(auth_headers):
    r = client.post(
        "/api/applications/ner-playground/run",
        json={"code": "doc = nlp(text)\nfor ent in doc.ents\n    print(ent)\n", "text": SAMPLE_TEXT},
        headers=auth_headers,
    )
    assert r.status_code == 200  # the SANDBOX failed, not the HTTP request
    body = r.json()
    assert body["status"] == "error"
    assert body["error"]["type"] == "SyntaxError"


def test_existing_ner_endpoint_still_works_unaffected(auth_headers):
    # Guards against the playground accidentally breaking the pre-existing,
    # unrelated /applications/ner endpoint (shared NER engine module).
    r = client.post("/api/applications/ner", json={"text": SAMPLE_TEXT}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["engine"] == "rule_based"
