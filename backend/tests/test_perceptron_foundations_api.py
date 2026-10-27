import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_mp_neuron_endpoint_matches_doc_example(auth_headers):
    response = client.post("/api/dl-module1/mp-neuron", json={"inputs": [1, 1], "weights": [1, 1], "threshold": 2}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["weighted_sum"] == 2
    assert body["fired"] is True
    assert body["output"] == 1


def test_mp_neuron_endpoint_rejects_mismatched_lengths(auth_headers):
    response = client.post("/api/dl-module1/mp-neuron", json={"inputs": [1, 1], "weights": [1], "threshold": 2}, headers=auth_headers)
    assert response.status_code == 422


def test_truth_table_endpoint_and(auth_headers):
    response = client.post("/api/dl-module1/truth-table", json={"gate": "AND"}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["gate"] == "AND"
    rows = {tuple(r["inputs"]): r["output"] for r in body["rows"]}
    assert rows == {(0, 0): 0, (0, 1): 0, (1, 0): 0, (1, 1): 1}


def test_truth_table_endpoint_rejects_xor(auth_headers):
    response = client.post("/api/dl-module1/truth-table", json={"gate": "XOR"}, headers=auth_headers)
    assert response.status_code == 422


def test_perceptron_forward_endpoint_matches_doc_example(auth_headers):
    response = client.post(
        "/api/dl-module1/perceptron-forward", json={"inputs": [1, 1], "weights": [0.5, 0.5], "bias": -0.7}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["weighted_sum"] == pytest.approx(0.3)
    assert body["output"] == 1


def test_pla_step_endpoint_matches_doc_example(auth_headers):
    response = client.post(
        "/api/dl-module1/pla-step",
        json={"inputs": [1, 1], "weights": [0.2, 0.3], "bias": -0.7, "target": 1, "learning_rate": 0.1}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == 0
    assert body["error"] == 1
    assert body["updated_weights"] == pytest.approx([0.3, 0.4])
    assert body["updated_bias"] == pytest.approx(-0.6)


def test_pla_step_endpoint_rejects_bad_target(auth_headers):
    response = client.post(
        "/api/dl-module1/pla-step",
        json={"inputs": [1], "weights": [1.0], "bias": 0.0, "target": 5, "learning_rate": 0.1}, headers=auth_headers
    )
    assert response.status_code == 422


def test_pla_train_endpoint_converges_on_and(auth_headers):
    response = client.post(
        "/api/dl-module1/pla-train",
        json={
            "training_data": [
                {"inputs": [0, 0], "target": 0},
                {"inputs": [0, 1], "target": 0},
                {"inputs": [1, 0], "target": 0},
                {"inputs": [1, 1], "target": 1},
            ],
            "initial_weights": [0.0, 0.0],
            "initial_bias": 0.0,
            "learning_rate": 0.1,
            "max_epochs": 50,
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["converged"] is True
    assert len(body["history"]) > 0


def test_pla_train_endpoint_rejects_empty_training_data(auth_headers):
    response = client.post(
        "/api/dl-module1/pla-train",
        json={"training_data": [], "initial_weights": [0.0], "initial_bias": 0.0, "learning_rate": 0.1}, headers=auth_headers
    )
    assert response.status_code == 422


def test_perceptron_foundations_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl-module1/mp-neuron")
    assert response.status_code == 401
