from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_languages_endpoint(auth_headers):
    r = client.get("/api/applications/translate/languages", headers=auth_headers)
    assert r.status_code == 200
    assert "en" in r.json()["languages"]


def test_translate_endpoint_rejects_unsupported_language(auth_headers):
    r = client.post(
        "/api/applications/translate",
        json={"text": "hello", "source_lang": "en", "target_lang": "zz"}, headers=auth_headers
    )
    assert r.status_code == 422


def test_translate_endpoint_rejects_same_language(auth_headers):
    r = client.post(
        "/api/applications/translate",
        json={"text": "hello", "source_lang": "en", "target_lang": "en"}, headers=auth_headers
    )
    assert r.status_code == 422


def test_translation_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to be callable by anyone, logged in or not. A call with no
    # Authorization header at all must now be refused with a real 401.
    response = client.get("/api/applications/translate/languages")
    assert response.status_code == 401
