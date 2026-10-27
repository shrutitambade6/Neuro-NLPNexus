import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_email_classification_endpoint_matches_doc_example(auth_headers):
    response = client.post("/api/dl-module2/email-classification", json={"inputs": [1, 0, 1]}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["h1_output"] == pytest.approx(0.8)
    assert body["h2_output"] == pytest.approx(0.0)
    assert body["is_spam"] is True


def test_email_classification_endpoint_rejects_wrong_input_count(auth_headers):
    response = client.post("/api/dl-module2/email-classification", json={"inputs": [1, 0]}, headers=auth_headers)
    assert response.status_code == 422


def test_backprop_step_endpoint_default_network(auth_headers):
    response = client.post("/api/dl-module2/backprop-step", json={}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["a3"] == pytest.approx(0.21)
    assert body["y5"] == pytest.approx(0.67, abs=0.02)
    assert body["updated_network"]["w45"] < 0.9


def test_backprop_step_endpoint_custom_network(auth_headers):
    response = client.post(
        "/api/dl-module2/backprop-step",
        json={"x1": 1.0, "x2": 0.0, "target": 1.0, "learning_rate": 0.5, "network": {"w13": 0.1, "w23": 0.1, "w14": 0.1, "w24": 0.1, "w35": 0.1, "w45": 0.1}}, headers=auth_headers
    )
    assert response.status_code == 200


def test_backprop_train_endpoint_converges(auth_headers):
    response = client.post("/api/dl-module2/backprop-train", json={"num_steps": 200}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["history"]) == 200
    assert abs(body["final_output"] - 0.5) < 0.05


def test_backprop_train_endpoint_rejects_zero_steps(auth_headers):
    response = client.post("/api/dl-module2/backprop-train", json={"num_steps": 0}, headers=auth_headers)
    assert response.status_code == 422


def test_backprop_train_endpoint_caps_steps_at_500(auth_headers):
    response = client.post("/api/dl-module2/backprop-train", json={"num_steps": 500}, headers=auth_headers)
    assert response.status_code == 200
    # a request for exactly 500 is fine (the field max), only larger is rejected by pydantic
    response2 = client.post("/api/dl-module2/backprop-train", json={"num_steps": 5000}, headers=auth_headers)
    assert response2.status_code == 422


def test_nn_module2_examples_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl-module2/email-classification")
    assert response.status_code == 401
