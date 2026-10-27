import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_linear_autoencoder_endpoint(auth_headers):
    response = client.post(
        "/api/dl-module3/linear-autoencoder",
        json={"input_vector": [3.0, 1.0], "encoder_weights": [[0.5, 0.5]], "decoder_weights": [[1.0], [1.0]]}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["latent"] == pytest.approx([2.0])
    assert body["mse"] == pytest.approx(1.0)


def test_linear_autoencoder_endpoint_rejects_bad_shape(auth_headers):
    response = client.post(
        "/api/dl-module3/linear-autoencoder",
        json={"input_vector": [1.0, 2.0], "encoder_weights": [[1.0, 1.0, 1.0]], "decoder_weights": [[1.0], [1.0]]}, headers=auth_headers
    )
    assert response.status_code == 422


def test_reconstruction_loss_endpoint(auth_headers):
    response = client.post(
        "/api/dl-module3/reconstruction-loss", json={"original": [0.2, 0.8], "reconstructed": [0.3, 0.7]}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["mse"] == pytest.approx(0.01)
    assert body["binary_cross_entropy"] == pytest.approx(0.5261, abs=0.001)


def test_sparsity_penalty_endpoint(auth_headers):
    response = client.post("/api/dl-module3/sparsity-penalty", json={"rho": 0.05, "rho_hat": 0.1}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["kl_divergence"] > 0


def test_sparsity_penalty_endpoint_rejects_boundary(auth_headers):
    response = client.post("/api/dl-module3/sparsity-penalty", json={"rho": 0.0, "rho_hat": 0.1}, headers=auth_headers)
    assert response.status_code == 422


def test_l2_penalty_endpoint(auth_headers):
    response = client.post("/api/dl-module3/l2-penalty", json={"weights": [0.5, -0.3], "lambda": 0.1, "learning_rate": 0.1}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["regularization_term"] == pytest.approx(0.34)
    assert body["penalty"] == pytest.approx(0.017)
    assert body["updated_weights"] == pytest.approx([0.495, -0.297])


def test_l2_penalty_endpoint_rejects_negative_lambda(auth_headers):
    response = client.post("/api/dl-module3/l2-penalty", json={"weights": [1.0], "lambda": -0.1}, headers=auth_headers)
    assert response.status_code == 422


def test_dropout_endpoint(auth_headers):
    response = client.post("/api/dl-module3/dropout", json={"activations": [1.0, 2.0, 3.0], "drop_probability": 0.5, "seed": 42}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["mask"]) == 3
    assert body["test_output"] == [1.0, 2.0, 3.0]


def test_dropout_endpoint_reproducible_with_seed(auth_headers):
    r1 = client.post("/api/dl-module3/dropout", json={"activations": [1.0, 1.0, 1.0, 1.0], "drop_probability": 0.5, "seed": 99}, headers=auth_headers).json()
    r2 = client.post("/api/dl-module3/dropout", json={"activations": [1.0, 1.0, 1.0, 1.0], "drop_probability": 0.5, "seed": 99}, headers=auth_headers).json()
    assert r1["mask"] == r2["mask"]


def test_dropout_endpoint_rejects_invalid_probability(auth_headers):
    response = client.post("/api/dl-module3/dropout", json={"activations": [1.0], "drop_probability": 1.0}, headers=auth_headers)
    assert response.status_code == 422


def test_autoencoder_concepts_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl-module3/linear-autoencoder")
    assert response.status_code == 401
