import math

import pytest

from app.algorithms.dl_foundations import (
    DlFoundationsError,
    compute_loss,
    gradient_descent,
    neuron_forward,
    single_neuron_gradient,
)


# ---- neuron_forward ----

def test_neuron_forward_sigmoid_known_value():
    result = neuron_forward(inputs=[1, 2], weights=[0.5, -1], bias=0.5, activation="sigmoid")
    # z = 0.5*1 + (-1)*2 + 0.5 = -1
    assert result.weighted_sum == pytest.approx(-1.0)
    assert result.activated_output == pytest.approx(1 / (1 + math.exp(1)))


def test_neuron_forward_relu_clips_negative_to_zero():
    result = neuron_forward(inputs=[1], weights=[-2], bias=0, activation="relu")
    assert result.weighted_sum == pytest.approx(-2.0)
    assert result.activated_output == 0.0


def test_neuron_forward_relu_passes_positive_through():
    result = neuron_forward(inputs=[3], weights=[2], bias=1, activation="relu")
    assert result.weighted_sum == pytest.approx(7.0)
    assert result.activated_output == pytest.approx(7.0)


def test_neuron_forward_leaky_relu_scales_negative():
    result = neuron_forward(inputs=[1], weights=[-10], bias=0, activation="leaky_relu")
    assert result.activated_output == pytest.approx(-10 * 0.01)


def test_neuron_forward_tanh_known_value():
    result = neuron_forward(inputs=[1], weights=[1], bias=0, activation="tanh")
    assert result.activated_output == pytest.approx(math.tanh(1.0))


def test_neuron_forward_linear_is_identity_on_z():
    result = neuron_forward(inputs=[2, 3], weights=[1, 1], bias=0, activation="linear")
    assert result.activated_output == pytest.approx(5.0)


def test_neuron_forward_rejects_mismatched_lengths():
    with pytest.raises(DlFoundationsError):
        neuron_forward(inputs=[1, 2], weights=[1], bias=0, activation="relu")


def test_neuron_forward_rejects_empty_inputs():
    with pytest.raises(DlFoundationsError):
        neuron_forward(inputs=[], weights=[], bias=0, activation="relu")


def test_neuron_forward_rejects_unknown_activation():
    with pytest.raises(DlFoundationsError):
        neuron_forward(inputs=[1], weights=[1], bias=0, activation="softmax")


def test_neuron_forward_has_a_readable_step_trace():
    result = neuron_forward(inputs=[1, 2], weights=[0.5, -1], bias=0.5, activation="sigmoid")
    assert len(result.steps) == 4
    assert "z =" in result.steps[0]


# ---- compute_loss ----

def test_mse_known_value():
    result = compute_loss(y_pred=0.8, y_true=1.0, loss_type="mse")
    assert result.loss == pytest.approx(0.04)


def test_mse_zero_when_prediction_matches_truth():
    result = compute_loss(y_pred=0.5, y_true=0.5, loss_type="mse")
    assert result.loss == pytest.approx(0.0)


def test_binary_crossentropy_known_value():
    result = compute_loss(y_pred=0.9, y_true=1.0, loss_type="binary_crossentropy")
    assert result.loss == pytest.approx(-math.log(0.9))


def test_binary_crossentropy_rejects_prediction_outside_open_interval():
    with pytest.raises(DlFoundationsError):
        compute_loss(y_pred=1.0, y_true=1.0, loss_type="binary_crossentropy")
    with pytest.raises(DlFoundationsError):
        compute_loss(y_pred=0.0, y_true=0.0, loss_type="binary_crossentropy")


def test_binary_crossentropy_rejects_non_binary_label():
    with pytest.raises(DlFoundationsError):
        compute_loss(y_pred=0.5, y_true=0.3, loss_type="binary_crossentropy")


def test_compute_loss_rejects_unknown_loss_type():
    with pytest.raises(DlFoundationsError):
        compute_loss(y_pred=0.5, y_true=1.0, loss_type="hinge")


# ---- single_neuron_gradient — verified against a numerical finite-difference gradient ----

def _numerical_gradient(inputs, weights, bias, y_true, activation, loss_type, eps=1e-6):
    """Independent check: estimate dL/dw_i and dL/db by nudging each
    parameter by a tiny amount and measuring how the loss actually changes,
    rather than trusting the analytic formula. If the analytic gradient in
    dl_foundations.py were wrong, this would catch it."""

    def loss_at(w, b):
        fwd = neuron_forward(inputs, w, b, activation)
        return compute_loss(fwd.activated_output, y_true, loss_type).loss

    base_w, base_b = list(weights), bias
    num_dw = []
    for i in range(len(weights)):
        w_plus = list(base_w)
        w_plus[i] += eps
        w_minus = list(base_w)
        w_minus[i] -= eps
        num_dw.append((loss_at(w_plus, base_b) - loss_at(w_minus, base_b)) / (2 * eps))
    num_db = (loss_at(base_w, base_b + eps) - loss_at(base_w, base_b - eps)) / (2 * eps)
    return num_dw, num_db


@pytest.mark.parametrize("activation", ["sigmoid", "tanh", "relu", "leaky_relu", "linear"])
@pytest.mark.parametrize("loss_type", ["mse"])
def test_gradient_matches_numerical_finite_difference(activation, loss_type):
    inputs = [1.0, -2.0, 0.5]
    weights = [0.3, -0.7, 1.2]
    bias = 0.1
    y_true = 1.0 if loss_type == "mse" else 1.0

    # relu/leaky_relu are non-smooth at z==0 — pick weights so z isn't near 0
    # for this input, so the finite-difference check isn't fighting a kink.
    analytic = single_neuron_gradient(inputs, weights, bias, y_true, activation, loss_type)
    num_dw, num_db = _numerical_gradient(inputs, weights, bias, y_true, activation, loss_type)

    for a, n in zip(analytic.dL_dw, num_dw):
        assert a == pytest.approx(n, abs=1e-4)
    assert analytic.dL_db == pytest.approx(num_db, abs=1e-4)


def test_gradient_sigmoid_binary_crossentropy_matches_numerical():
    inputs = [0.5, 1.5]
    weights = [0.2, -0.4]
    bias = 0.05
    analytic = single_neuron_gradient(inputs, weights, bias, 1.0, "sigmoid", "binary_crossentropy")
    num_dw, num_db = _numerical_gradient(inputs, weights, bias, 1.0, "sigmoid", "binary_crossentropy")
    for a, n in zip(analytic.dL_dw, num_dw):
        assert a == pytest.approx(n, abs=1e-4)
    assert analytic.dL_db == pytest.approx(num_db, abs=1e-4)


def test_gradient_rejects_binary_crossentropy_with_non_sigmoid():
    with pytest.raises(DlFoundationsError):
        single_neuron_gradient([1.0], [1.0], 0.0, 1.0, "relu", "binary_crossentropy")


# ---- gradient_descent ----

def test_gradient_descent_reduces_loss_over_epochs():
    result = gradient_descent(
        inputs=[1.0, 2.0],
        weights=[0.1, 0.1],
        bias=0.0,
        y_true=1.0,
        activation="sigmoid",
        loss_type="mse",
        learning_rate=0.5,
        epochs=20,
    )
    assert len(result.steps) == 20
    first_loss = result.steps[0].loss
    last_loss = result.steps[-1].loss
    assert last_loss < first_loss
    assert result.final_loss <= last_loss  # one more real step past the recorded history


def test_gradient_descent_step_epochs_are_sequential():
    result = gradient_descent(
        inputs=[1.0], weights=[0.0], bias=0.0, y_true=1.0,
        activation="linear", loss_type="mse", learning_rate=0.1, epochs=5,
    )
    assert [s.epoch for s in result.steps] == [1, 2, 3, 4, 5]


def test_gradient_descent_rejects_non_positive_learning_rate():
    with pytest.raises(DlFoundationsError):
        gradient_descent([1.0], [0.0], 0.0, 1.0, "sigmoid", "mse", learning_rate=0, epochs=5)


def test_gradient_descent_rejects_epochs_out_of_range():
    with pytest.raises(DlFoundationsError):
        gradient_descent([1.0], [0.0], 0.0, 1.0, "sigmoid", "mse", learning_rate=0.1, epochs=0)
    with pytest.raises(DlFoundationsError):
        gradient_descent([1.0], [0.0], 0.0, 1.0, "sigmoid", "mse", learning_rate=0.1, epochs=51)


def test_gradient_descent_rejects_binary_crossentropy_with_non_sigmoid():
    with pytest.raises(DlFoundationsError):
        gradient_descent([1.0], [0.0], 0.0, 1.0, "relu", "binary_crossentropy", learning_rate=0.1, epochs=5)
