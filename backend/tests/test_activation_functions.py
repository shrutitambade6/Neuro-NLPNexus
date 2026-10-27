import math

import pytest

from app.algorithms.activation_functions import (
    ActivationFunctionsError,
    activate,
    activate_derivative,
    activation_curve,
    softmax,
)


# ---- activate ----

def test_sigmoid_known_value():
    assert activate(0.0, "sigmoid") == pytest.approx(0.5)


def test_sigmoid_extreme_values_saturate_without_crashing():
    assert activate(-10000, "sigmoid") == 0.0
    assert activate(10000, "sigmoid") == 1.0


def test_tanh_known_value():
    assert activate(0.0, "tanh") == pytest.approx(0.0)
    assert activate(1.0, "tanh") == pytest.approx(math.tanh(1.0))


def test_relu_known_values():
    assert activate(-5, "relu") == 0.0
    assert activate(5, "relu") == 5.0


def test_leaky_relu_known_values():
    assert activate(-10, "leaky_relu") == pytest.approx(-0.1)
    assert activate(10, "leaky_relu") == 10.0


def test_linear_is_identity():
    assert activate(3.7, "linear") == 3.7


def test_activate_rejects_softmax_with_a_helpful_message():
    with pytest.raises(ActivationFunctionsError, match="softmax"):
        activate(0.0, "softmax")


def test_activate_rejects_unknown_name():
    with pytest.raises(ActivationFunctionsError):
        activate(0.0, "gelu")


# ---- activate_derivative — verified against numerical finite difference ----

@pytest.mark.parametrize("name", ["sigmoid", "tanh", "relu", "leaky_relu", "linear"])
def test_derivative_matches_numerical_finite_difference(name):
    eps = 1e-6
    for z in (-3.0, -0.5, 0.5, 3.0):  # avoid exactly 0, a kink for relu/leaky_relu
        analytic = activate_derivative(z, name)
        numerical = (activate(z + eps, name) - activate(z - eps, name)) / (2 * eps)
        assert analytic == pytest.approx(numerical, abs=1e-4)


def test_derivative_rejects_softmax():
    with pytest.raises(ActivationFunctionsError):
        activate_derivative(0.0, "softmax")


# ---- activation_curve ----

def test_activation_curve_endpoints_and_count():
    points = activation_curve("relu", -2, 2, 5)
    assert len(points) == 5
    zs = [p[0] for p in points]
    assert zs[0] == pytest.approx(-2)
    assert zs[-1] == pytest.approx(2)


def test_activation_curve_values_match_activate():
    points = activation_curve("sigmoid", -1, 1, 3)
    for z, y in points:
        assert y == pytest.approx(activate(z, "sigmoid"))


def test_activation_curve_rejects_reversed_range():
    with pytest.raises(ActivationFunctionsError):
        activation_curve("relu", 2, -2, 10)


def test_activation_curve_rejects_out_of_range_point_count():
    with pytest.raises(ActivationFunctionsError):
        activation_curve("relu", -1, 1, 1)
    with pytest.raises(ActivationFunctionsError):
        activation_curve("relu", -1, 1, 500)


def test_activation_curve_rejects_softmax():
    with pytest.raises(ActivationFunctionsError):
        activation_curve("softmax", -1, 1, 10)


# ---- softmax ----

def test_softmax_sums_to_one():
    output = softmax([1.0, 2.0, 3.0])
    assert sum(output) == pytest.approx(1.0)


def test_softmax_equal_inputs_give_equal_probabilities():
    output = softmax([5.0, 5.0, 5.0, 5.0])
    for o in output:
        assert o == pytest.approx(0.25)


def test_softmax_known_small_example():
    # softmax([0, 0]) = [0.5, 0.5]
    output = softmax([0.0, 0.0])
    assert output == pytest.approx([0.5, 0.5])


def test_softmax_larger_logit_gets_larger_probability():
    output = softmax([1.0, 5.0])
    assert output[1] > output[0]


def test_softmax_numerically_stable_for_large_values():
    # Without the max-subtraction trick, exp(1000) overflows to inf and
    # produces nan — this must still return real, finite probabilities.
    output = softmax([1000.0, 1001.0, 999.0])
    assert all(math.isfinite(o) for o in output)
    assert sum(output) == pytest.approx(1.0)


def test_softmax_rejects_empty_input():
    with pytest.raises(ActivationFunctionsError):
        softmax([])
