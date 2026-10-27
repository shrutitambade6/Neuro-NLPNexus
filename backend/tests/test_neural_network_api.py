from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_random_network_endpoint_basic(auth_headers):
    response = client.post(
        "/api/dl/network/random",
        json={"input_size": 2, "layers": [{"size": 3, "activation": "relu"}, {"size": 1, "activation": "sigmoid"}], "seed": 1}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["layers"]) == 2
    assert len(body["layers"][0]["weights"]) == 3
    assert all(len(w) == 2 for w in body["layers"][0]["weights"])
    assert len(body["layers"][1]["weights"]) == 1
    assert all(len(w) == 3 for w in body["layers"][1]["weights"])


def test_random_network_endpoint_seed_is_reproducible(auth_headers):
    payload = {"input_size": 2, "layers": [{"size": 4, "activation": "tanh"}], "seed": 99}
    r1 = client.post("/api/dl/network/random", json=payload, headers=auth_headers)
    r2 = client.post("/api/dl/network/random", json=payload, headers=auth_headers)
    assert r1.json()["layers"] == r2.json()["layers"]


def test_random_network_endpoint_rejects_too_many_neurons(auth_headers):
    response = client.post(
        "/api/dl/network/random",
        json={"input_size": 2, "layers": [{"size": 50, "activation": "relu"}]}, headers=auth_headers
    )
    # Rejected either by the pydantic Field(le=8) bound or the algorithm's own check.
    assert response.status_code == 422


def test_forward_propagation_endpoint_basic(auth_headers):
    gen = client.post(
        "/api/dl/network/random",
        json={"input_size": 2, "layers": [{"size": 3, "activation": "relu"}, {"size": 1, "activation": "sigmoid"}], "seed": 5}, headers=auth_headers
    )
    network = gen.json()
    response = client.post(
        "/api/dl/network/forward",
        json={"input_size": network["input_size"], "layers": network["layers"], "inputs": [1.0, -1.0]}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["layers"]) == 2
    assert len(body["output"]) == 1
    assert 0 < body["output"][0] < 1


def test_forward_propagation_endpoint_rejects_wrong_input_count(auth_headers):
    gen = client.post(
        "/api/dl/network/random",
        json={"input_size": 3, "layers": [{"size": 2, "activation": "relu"}], "seed": 5}, headers=auth_headers
    )
    network = gen.json()
    response = client.post(
        "/api/dl/network/forward",
        json={"input_size": network["input_size"], "layers": network["layers"], "inputs": [1.0, 2.0]}, headers=auth_headers
    )
    assert response.status_code == 422


def test_neural_network_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl/network/random")
    assert response.status_code == 401
