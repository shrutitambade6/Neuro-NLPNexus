from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_random_projection_endpoint_and_reproducibility(auth_headers):
    payload = {"dim": 3, "d_k": 2, "d_v": 2, "seed": 6}
    r1 = client.post("/api/dl/attention/random-projection", json=payload, headers=auth_headers)
    r2 = client.post("/api/dl/attention/random-projection", json=payload, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json() == r2.json()


def test_attention_forward_endpoint_end_to_end(auth_headers):
    weights = client.post("/api/dl/attention/random-projection", json={"dim": 3, "d_k": 2, "d_v": 2, "seed": 1}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/attention/forward",
        json={
            "embeddings": [[1.0, 0.0, 0.5], [0.0, 1.0, -0.5], [1.0, 1.0, 0.0]],
            "weights": weights,
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["attention_weights"]) == 3
    for row in body["attention_weights"]:
        assert abs(sum(row) - 1.0) < 1e-6
    assert len(body["output"]) == 3
    assert len(body["output"][0]) == 2  # d_v


def test_attention_forward_endpoint_rejects_dim_mismatch(auth_headers):
    weights = client.post("/api/dl/attention/random-projection", json={"dim": 3, "d_k": 2, "d_v": 2, "seed": 1}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/attention/forward",
        json={"embeddings": [[1.0, 0.0], [0.0, 1.0]], "weights": weights}, headers=auth_headers
    )
    assert response.status_code == 422


def test_attention_forward_endpoint_rejects_too_short_sequence(auth_headers):
    weights = client.post("/api/dl/attention/random-projection", json={"dim": 2, "d_k": 2, "d_v": 2, "seed": 1}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/attention/forward",
        json={"embeddings": [[1.0, 0.0]], "weights": weights}, headers=auth_headers
    )
    assert response.status_code == 422


def test_attention_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl/attention/random-projection")
    assert response.status_code == 401
