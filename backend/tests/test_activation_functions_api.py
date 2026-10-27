import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_activation_curve_endpoint_basic(auth_headers):
    response = client.post(
        "/api/dl/activation-curve",
        json={"activation": "sigmoid", "z_min": -5, "z_max": 5, "num_points": 50}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["points"]) == 50
    assert body["points"][0]["z"] == pytest.approx(-5)
    assert body["points"][-1]["z"] == pytest.approx(5)


def test_activation_curve_endpoint_rejects_bad_range(auth_headers):
    response = client.post(
        "/api/dl/activation-curve",
        json={"activation": "relu", "z_min": 5, "z_max": -5, "num_points": 50}, headers=auth_headers
    )
    assert response.status_code == 422


def test_activation_point_endpoint_basic(auth_headers):
    response = client.post("/api/dl/activation-point", json={"activation": "sigmoid", "z": 0}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["y"] == pytest.approx(0.5)
    assert body["derivative"] == pytest.approx(0.25)  # sigmoid'(0) = 0.5*(1-0.5)


def test_activation_point_endpoint_rejects_softmax(auth_headers):
    response = client.post("/api/dl/activation-point", json={"activation": "softmax", "z": 0}, headers=auth_headers)
    assert response.status_code == 422


def test_softmax_endpoint_basic(auth_headers):
    response = client.post("/api/dl/softmax", json={"values": [1.0, 2.0, 3.0]}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert sum(body["output"]) == pytest.approx(1.0)
    assert len(body["steps"]) == 4


def test_softmax_endpoint_rejects_empty_values(auth_headers):
    response = client.post("/api/dl/softmax", json={"values": []}, headers=auth_headers)
    assert response.status_code == 422


def test_activation_functions_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl/activation-curve")
    assert response.status_code == 401
