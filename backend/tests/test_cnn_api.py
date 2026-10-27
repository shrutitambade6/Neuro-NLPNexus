from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

IMAGE_4x4 = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1]]
KERNEL_2x2 = [[1, 0], [0, 1]]


def test_preset_kernels_endpoint(auth_headers):
    response = client.get("/api/dl/cnn/kernels", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert "edge_detect" in body["kernels"]
    assert "identity" in body["kernels"]


def test_convolve_endpoint(auth_headers):
    response = client.post("/api/dl/cnn/convolve", json={"image": IMAGE_4x4, "kernel": KERNEL_2x2, "stride": 1}, headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["feature_map"]) == 3 and len(body["feature_map"][0]) == 3


def test_convolve_endpoint_rejects_oversized_kernel(auth_headers):
    response = client.post(
        "/api/dl/cnn/convolve",
        json={"image": [[1, 2], [3, 4]], "kernel": KERNEL_2x2, "stride": 1}, headers=auth_headers
    )
    assert response.status_code == 422


def test_pool_endpoint(auth_headers):
    response = client.post(
        "/api/dl/cnn/pool",
        json={"matrix": [[1, 3, 2, 4], [5, 6, 1, 2], [7, 8, 9, 0], [1, 2, 3, 4]], "pool_type": "max", "size": 2, "stride": 2}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["pooled"] == [[6, 4], [8, 9]]


def test_random_dense_endpoint_and_reproducibility(auth_headers):
    payload = {"input_size": 4, "output_size": 2, "seed": 7}
    r1 = client.post("/api/dl/cnn/random-dense", json=payload, headers=auth_headers)
    r2 = client.post("/api/dl/cnn/random-dense", json=payload, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json() == r2.json()


def test_cnn_forward_endpoint_end_to_end(auth_headers):
    # image(4x4) conv kernel(2x2) stride1 -> 3x3 feature map; pool(2x2)
    # stride1 -> pooled 2x2 -> flattened length 4.
    dense = client.post("/api/dl/cnn/random-dense", json={"input_size": 4, "output_size": 2, "seed": 3}, headers=auth_headers).json()
    response = client.post(
        "/api/dl/cnn/forward",
        json={
            "image": IMAGE_4x4,
            "kernel": KERNEL_2x2,
            "conv_stride": 1,
            "conv_activation": "relu",
            "pool_type": "max",
            "pool_size": 2,
            "pool_stride": 1,
            "dense": dense,
            "class_labels": ["x", "o"],
        }, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["class_scores"]) == 2
    assert abs(sum(body["class_scores"]) - 1.0) < 1e-6
    assert body["predicted_class"] in ("x", "o")


def test_cnn_forward_endpoint_rejects_mismatched_dense_shape(auth_headers):
    response = client.post(
        "/api/dl/cnn/forward",
        json={
            "image": IMAGE_4x4,
            "kernel": KERNEL_2x2,
            "conv_stride": 1,
            "conv_activation": "relu",
            "pool_type": "max",
            "pool_size": 2,
            "pool_stride": 1,
            "dense": {"weights": [[1, 2, 3]], "biases": [0]},  # wrong flattened size
            "class_labels": ["x", "o"],  # 1 dense neuron but 2 labels
        }, headers=auth_headers
    )
    assert response.status_code == 422


def test_cnn_rejects_anonymous_requests():
    # Task 1 ("fix authentication / protected content"): this endpoint used
    # to be callable by anyone, logged in or not. A call with no
    # Authorization header at all must now be refused with a real 401.
    response = client.get("/api/dl/cnn/kernels")
    assert response.status_code == 401
