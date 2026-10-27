import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_neuron_forward_endpoint_basic(auth_headers):
    response = client.post(
        "/api/dl/neuron-forward",
        json={"inputs": [1, 2], "weights": [0.5, -1], "bias": 0.5, "activation": "sigmoid"}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["weighted_sum"] == -1.0
    assert 0 < body["activated_output"] < 1
    assert len(body["steps"]) == 4


def test_neuron_forward_endpoint_rejects_mismatched_lengths(auth_headers):
    response = client.post(
        "/api/dl/neuron-forward",
        json={"inputs": [1, 2], "weights": [1], "bias": 0, "activation": "relu"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_loss_endpoint_mse(auth_headers):
    response = client.post("/api/dl/loss", json={"y_pred": 0.8, "y_true": 1.0, "loss_type": "mse"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["loss"] == pytest.approx(0.04)


def test_loss_endpoint_rejects_bce_prediction_out_of_range(auth_headers):
    response = client.post(
        "/api/dl/loss", json={"y_pred": 1.0, "y_true": 1.0, "loss_type": "binary_crossentropy"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_gradient_endpoint_basic(auth_headers):
    response = client.post(
        "/api/dl/gradient",
        json={
            "inputs": [1.0, -2.0],
            "weights": [0.3, -0.7],
            "bias": 0.1,
            "y_true": 1.0,
            "activation": "sigmoid",
            "loss_type": "mse",
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["dl_dw"]) == 2
    assert "steps" in body


def test_gradient_endpoint_rejects_bce_with_non_sigmoid(auth_headers):
    response = client.post(
        "/api/dl/gradient",
        json={
            "inputs": [1.0],
            "weights": [1.0],
            "bias": 0.0,
            "y_true": 1.0,
            "activation": "relu",
            "loss_type": "binary_crossentropy",
        }, headers=auth_headers
    )
    assert response.status_code == 422


def test_gradient_descent_endpoint_basic(auth_headers):
    response = client.post(
        "/api/dl/gradient-descent",
        json={
            "inputs": [1.0, 2.0],
            "weights": [0.1, 0.1],
            "bias": 0.0,
            "y_true": 1.0,
            "activation": "sigmoid",
            "loss_type": "mse",
            "learning_rate": 0.5,
            "epochs": 10,
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["steps"]) == 10
    assert body["steps"][-1]["loss"] <= body["steps"][0]["loss"]


def test_gradient_descent_endpoint_rejects_epochs_over_cap(auth_headers):
    response = client.post(
        "/api/dl/gradient-descent",
        json={
            "inputs": [1.0],
            "weights": [0.1],
            "bias": 0.0,
            "y_true": 1.0,
            "activation": "sigmoid",
            "loss_type": "mse",
            "learning_rate": 0.1,
            "epochs": 500,
        }, headers=auth_headers
    )
    assert response.status_code == 422


def test_dl_foundations_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl/neuron-forward")
    assert response.status_code == 401
