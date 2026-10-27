from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_random_rnn_endpoint_and_reproducibility(auth_headers):
    payload = {"input_size": 2, "hidden_size": 3, "output_size": 1, "seed": 5}
    r1 = client.post("/api/dl/rnn/random", json=payload, headers=auth_headers)
    r2 = client.post("/api/dl/rnn/random", json=payload, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json() == r2.json()


def test_rnn_forward_endpoint_end_to_end(auth_headers):
    weights = client.post("/api/dl/rnn/random", json={"input_size": 2, "hidden_size": 3, "output_size": 2, "seed": 1}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/rnn/forward",
        json={
            "weights": weights,
            "sequence": [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]],
            "activation": "tanh",
            "output_activation": "softmax",
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["steps"]) == 3
    for step in body["steps"]:
        assert abs(sum(step["y"]) - 1.0) < 1e-6


def test_rnn_forward_endpoint_rejects_wrong_input_dim(auth_headers):
    weights = client.post("/api/dl/rnn/random", json={"input_size": 2, "hidden_size": 2, "output_size": 1, "seed": 1}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/rnn/forward",
        json={"weights": weights, "sequence": [[1.0, 2.0, 3.0]], "activation": "tanh", "output_activation": "linear"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_random_lstm_endpoint_and_reproducibility(auth_headers):
    payload = {"input_size": 2, "hidden_size": 2, "seed": 8}
    r1 = client.post("/api/dl/lstm/random", json=payload, headers=auth_headers)
    r2 = client.post("/api/dl/lstm/random", json=payload, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json() == r2.json()


def test_lstm_forward_endpoint_end_to_end(auth_headers):
    weights = client.post("/api/dl/lstm/random", json={"input_size": 2, "hidden_size": 3, "seed": 2}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/lstm/forward",
        json={"weights": weights, "sequence": [[1.0, 0.0], [0.0, 1.0]]}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["steps"]) == 2
    assert len(body["final_hidden"]) == 3
    assert len(body["final_cell"]) == 3


def test_lstm_forward_endpoint_rejects_wrong_input_dim(auth_headers):
    weights = client.post("/api/dl/lstm/random", json={"input_size": 2, "hidden_size": 2, "seed": 2}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/lstm/forward",
        json={"weights": weights, "sequence": [[1.0, 2.0, 3.0]]}, headers=auth_headers
    )
    assert response.status_code == 422


def test_rnn_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to run for anyone, logged in or not. A call with no Authorization
    # header at all must now be refused before any payload is even looked
    # at — not a 422 on a bad/missing body, a real 401.
    response = client.post("/api/dl/rnn/random")
    assert response.status_code == 401
