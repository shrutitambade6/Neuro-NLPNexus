import math

import pytest

from app.algorithms.cnn import (
    CnnError,
    DenseWeights,
    apply_activation2d,
    cnn_forward,
    convolve2d,
    dense_forward,
    flatten,
    pool2d,
    random_dense_weights,
)
from app.algorithms.dl_foundations import neuron_forward


class TestConvolve2d:
    def test_identity_kernel_returns_center_region_unchanged(self):
        image = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]
        kernel = [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
        fm = convolve2d(image, kernel, stride=1)
        # valid convolution of a 4x4 image with a 3x3 kernel -> 2x2 output,
        # and the identity kernel just picks out the center of each window
        assert fm == [[6, 7], [10, 11]]

    def test_manual_4x4_sum_kernel_matches_hand_computation(self):
        image = [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]]
        kernel = [[1, 1], [1, 1]]
        fm = convolve2d(image, kernel, stride=1)
        # every 2x2 window of all-ones convolved with all-ones kernel = 4,
        # and a 4x4 image with a 2x2 kernel (valid conv) gives a 3x3 output
        assert fm == [[4, 4, 4], [4, 4, 4], [4, 4, 4]]

    def test_stride_2_output_shape(self):
        image = [[i + j for j in range(5)] for i in range(5)]
        kernel = [[1, 0], [0, 1]]
        fm = convolve2d(image, kernel, stride=2)
        assert len(fm) == 2 and len(fm[0]) == 2

    def test_kernel_larger_than_image_rejected(self):
        with pytest.raises(CnnError):
            convolve2d([[1, 2], [3, 4]], [[1, 1, 1], [1, 1, 1], [1, 1, 1]])

    def test_non_square_kernel_rejected(self):
        with pytest.raises(CnnError):
            convolve2d([[1] * 4 for _ in range(4)], [[1, 1], [1, 1], [1, 1]])

    def test_ragged_image_rejected(self):
        with pytest.raises(CnnError):
            convolve2d([[1, 2, 3, 4], [1, 2, 3]], [[1, 0], [0, 1]])

    def test_bad_stride_rejected(self):
        image = [[1] * 5 for _ in range(5)]
        with pytest.raises(CnnError):
            convolve2d(image, [[1, 0], [0, 1]], stride=0)


class TestActivation2d:
    def test_relu_zeroes_negatives(self):
        out = apply_activation2d([[-2, 3], [0, -0.5]], "relu")
        assert out == [[0.0, 3.0], [0.0, 0.0]]

    def test_sigmoid_bounds(self):
        out = apply_activation2d([[-100, 0, 100]], "sigmoid")
        assert out[0][0] == pytest.approx(0.0, abs=1e-6)
        assert out[0][1] == pytest.approx(0.5)
        assert out[0][2] == pytest.approx(1.0, abs=1e-6)

    def test_unknown_activation_rejected(self):
        with pytest.raises(CnnError):
            apply_activation2d([[1]], "not_an_activation")

    def test_softmax_rejected_here(self):
        # softmax is over a whole vector, not pointwise per-cell — cnn.py
        # correctly refuses it the same way activation_functions.activate() does
        with pytest.raises(CnnError):
            apply_activation2d([[1, 2]], "softmax")


class TestPool2d:
    def test_max_pool_hand_computation(self):
        matrix = [[1, 3, 2, 4], [5, 6, 1, 2], [7, 8, 9, 0], [1, 2, 3, 4]]
        pooled = pool2d(matrix, "max", size=2, stride=2)
        assert pooled == [[6, 4], [8, 9]]

    def test_avg_pool_hand_computation(self):
        matrix = [[1, 2], [3, 4]]
        pooled = pool2d(matrix, "avg", size=2, stride=2)
        assert pooled == [[2.5]]

    def test_pool_window_larger_than_matrix_rejected(self):
        with pytest.raises(CnnError):
            pool2d([[1, 2], [3, 4]], "max", size=3, stride=1)

    def test_unknown_pool_type_rejected(self):
        with pytest.raises(CnnError):
            pool2d([[1, 2], [3, 4]], "min", size=1, stride=1)


class TestFlatten:
    def test_row_major_order(self):
        assert flatten([[1, 2], [3, 4]]) == [1, 2, 3, 4]


class TestRandomDenseWeights:
    def test_shape_matches_request(self):
        d = random_dense_weights(6, 3, seed=1)
        assert len(d.weights) == 3
        assert all(len(row) == 6 for row in d.weights)
        assert len(d.biases) == 3

    def test_seeded_is_reproducible(self):
        a = random_dense_weights(4, 2, seed=42)
        b = random_dense_weights(4, 2, seed=42)
        assert a.weights == b.weights
        assert a.biases == b.biases

    def test_unseeded_is_genuinely_random(self):
        a = random_dense_weights(4, 2)
        b = random_dense_weights(4, 2)
        assert a.weights != b.weights  # astronomically unlikely to collide by chance

    def test_output_size_out_of_range_rejected(self):
        with pytest.raises(CnnError):
            random_dense_weights(4, 0)
        with pytest.raises(CnnError):
            random_dense_weights(4, 100)


class TestDenseForward:
    def test_softmax_outputs_sum_to_one(self):
        dense = DenseWeights(weights=[[1, 2], [0.5, -1], [0, 0]], biases=[0.1, -0.2, 0.0])
        result = dense_forward([1.0, 0.5], dense, ["cat", "dog", "bird"])
        assert sum(result.output) == pytest.approx(1.0)
        assert all(0.0 <= p <= 1.0 for p in result.output)

    def test_matches_manual_softmax(self):
        dense = DenseWeights(weights=[[1, 0], [0, 1]], biases=[0, 0])
        result = dense_forward([2.0, 1.0], dense, ["a", "b"])
        # z = [2, 1] -> softmax = [e^2, e^1] / (e^2 + e^1)
        e2, e1 = math.exp(2), math.exp(1)
        assert result.output[0] == pytest.approx(e2 / (e2 + e1))
        assert result.output[1] == pytest.approx(e1 / (e2 + e1))

    def test_single_dense_neuron_matches_dl_foundations_neuron_forward_before_softmax(self):
        # A dense layer's z for one neuron is exactly the same weighted-sum
        # arithmetic as DL Foundations' single neuron — cross-checking this
        # the same way Stage 5's Neural Network Playground cross-checked its
        # forward_propagate() against neuron_forward().
        inputs = [0.3, -0.7, 1.2]
        weights = [0.5, -0.2, 0.1]
        bias = 0.05
        dense = DenseWeights(weights=[weights], biases=[bias])
        z = dense_forward(inputs, dense, ["only-class"]).z[0]
        expected = neuron_forward(inputs, weights, bias, "linear").weighted_sum
        assert z == pytest.approx(expected)

    def test_weight_shape_mismatch_rejected(self):
        dense = DenseWeights(weights=[[1, 2, 3]], biases=[0])
        with pytest.raises(CnnError):
            dense_forward([1, 2], dense, ["a"])

    def test_label_count_mismatch_rejected(self):
        dense = DenseWeights(weights=[[1], [2]], biases=[0, 0])
        with pytest.raises(CnnError):
            dense_forward([1], dense, ["only-one-label"])


class TestCnnForwardPipeline:
    def _small_network(self):
        image = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1]]
        kernel = [[1, 0], [0, 1]]
        # image(4x4) conv kernel(2x2) stride1 -> feature map 3x3; pool(2x2)
        # stride1 -> pooled 2x2 -> flattened length 4, so each dense neuron
        # needs exactly 4 weights.
        dense = DenseWeights(weights=[[1.0, -1.0, 0.5, 0.2], [0.5, 0.5, -0.3, 0.1]], biases=[0.0, 0.0])
        return image, kernel, dense

    def test_full_pipeline_runs_and_chains_stages(self):
        image, kernel, dense = self._small_network()
        result = cnn_forward(
            image=image,
            kernel=kernel,
            conv_stride=1,
            conv_activation="relu",
            pool_type="max",
            pool_size=2,
            pool_stride=1,
            dense=dense,
            class_labels=["x", "o"],
        )
        # image (4x4) conv kernel(2x2) stride 1 -> feature map 3x3
        assert len(result.feature_map) == 3 and len(result.feature_map[0]) == 3
        # relu applied
        assert all(v >= 0 for row in result.activated_map for v in row)
        # pool 2x2 stride 1 over 3x3 -> 2x2
        assert len(result.pooled_map) == 2 and len(result.pooled_map[0]) == 2
        assert result.flattened == flatten(result.pooled_map)
        assert len(result.class_scores) == 2
        assert sum(result.class_scores) == pytest.approx(1.0)
        assert result.predicted_class in ("x", "o")

    def test_predicted_class_matches_argmax_of_scores(self):
        image, kernel, dense = self._small_network()
        result = cnn_forward(
            image=image, kernel=kernel, conv_stride=1, conv_activation="relu",
            pool_type="avg", pool_size=2, pool_stride=1, dense=dense, class_labels=["x", "o"],
        )
        best = max(range(len(result.class_scores)), key=lambda i: result.class_scores[i])
        assert result.predicted_class == result.class_labels[best]

    def test_image_too_small_rejected(self):
        with pytest.raises(CnnError):
            cnn_forward(
                image=[[1, 2], [3, 4]], kernel=[[1, 0], [0, 1]], conv_stride=1,
                conv_activation="relu", pool_type="max", pool_size=1, pool_stride=1,
                dense=DenseWeights(weights=[[1]], biases=[0]), class_labels=["a"],
            )
