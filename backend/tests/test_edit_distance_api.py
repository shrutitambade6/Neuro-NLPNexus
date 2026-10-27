from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_edit_distance_endpoint_basic(auth_headers):
    response = client.post("/api/edit-distance/compute", json={"source": "kitten", "target": "sitting"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["distance"] == 3
    assert len(body["matrix"]) == 7
    assert len(body["operations"]) > 0


def test_edit_distance_endpoint_rejects_empty_string(auth_headers):
    response = client.post("/api/edit-distance/compute", json={"source": "", "target": "cat"}, headers=auth_headers)
    assert response.status_code == 422


def test_edit_distance_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/edit-distance/compute")
    assert response.status_code == 401
