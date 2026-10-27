"""
Deep Learning Foundations — the real arithmetic behind a single artificial
neuron: a weighted sum, an activation function, a loss, and the calculus of
one gradient-descent step. Every number here is genuinely computed from the
inputs given — the same "compute something real" standard this project
holds every NLP lab to, extended to the new Deep Learning domain.

Softmax is deliberately NOT included here: it's defined over a whole
layer's output vector (it normalizes several neurons' outputs together),
not a single neuron in isolation, so it belongs with the Activation
Function Visualizer (a later stage) rather than this single-neuron module.
"""
import math
from dataclasses import dataclass, field

from app.algorithms.activation_functions import (
    ActivationFunctionsError,
    activate as _shared_activate,
    activate_derivative as _shared_activate_derivative,
)


class DlFoundationsError(ValueError):
    """Raised for invalid input to a Deep Learning Foundations calculation."""


ACTIVATIONS = ("sigmoid", "tanh", "relu", "leaky_relu", "linear")
LOSSES = ("mse", "binary_crossentropy")

_LOG_EPS = 1e-12  # numerical-stability clamp so log() never sees exactly 0 or 1
MAX_GD_EPOCHS = 50


# The actual pointwise math (and its derivative) now lives in
# activation_functions.py, shared with the Activation Function Visualizer,
# so both compute it identically — this module just delegates and keeps
# its own DlFoundationsError type for callers that already catch it.
def _activate(z: float, activation: str) -> float:
    try:
        return _shared_activate(z, activation)
    except ActivationFunctionsError as exc:
        raise DlFoundationsError(str(exc)) from exc


def _activate_derivative(z: float, activation: str) -> float:
    try:
        return _shared_activate_derivative(z, activation)
    except ActivationFunctionsError as exc:
        raise DlFoundationsError(str(exc)) from exc


def _validate_activation(activation: str) -> None:
    if activation not in ACTIVATIONS:
        raise DlFoundationsError(
            f"Unknown activation '{activation}'. Choose one of: {', '.join(ACTIVATIONS)}."
        )


def _validate_inputs_weights(inputs: list[float], weights: list[float]) -> None:
    if not inputs:
        raise DlFoundationsError("Provide at least one input.")
    if len(inputs) != len(weights):
        raise DlFoundationsError(
            f"Got {len(inputs)} input(s) but {len(weights)} weight(s) — they must match 1:1."
        )


@dataclass
class NeuronForwardResult:
    weighted_sum: float
    activated_output: float
    activation: str
    steps: list[str] = field(default_factory=list)


def neuron_forward(
    inputs: list[float], weights: list[float], bias: float, activation: str
) -> NeuronForwardResult:
    """A single artificial neuron's forward pass: z = sum(x_i * w_i) + b,
    then activation(z). Real arithmetic on whatever inputs/weights/bias are
    given — nothing here is a canned example."""
    _validate_activation(activation)
    _validate_inputs_weights(inputs, weights)

    products = [x * w for x, w in zip(inputs, weights)]
    z = sum(products) + bias
    output = _activate(z, activation)

    terms = " + ".join(f"({x:g}×{w:g})" for x, w in zip(inputs, weights))
    steps = [
        f"z = {terms} + {bias:g}",
        f"z = {' + '.join(f'{p:g}' for p in products)} + {bias:g}",
        f"z = {z:g}",
        f"output = {activation}(z) = {output:g}",
    ]
    return NeuronForwardResult(weighted_sum=z, activated_output=output, activation=activation, steps=steps)


@dataclass
class LossResult:
    loss: float
    loss_type: str
    steps: list[str] = field(default_factory=list)


def compute_loss(y_pred: float, y_true: float, loss_type: str) -> LossResult:
    if loss_type not in LOSSES:
        raise DlFoundationsError(f"Unknown loss '{loss_type}'. Choose one of: {', '.join(LOSSES)}.")

    if loss_type == "mse":
        loss = (y_pred - y_true) ** 2
        steps = [
            f"L = (ŷ − y)² = ({y_pred:g} − {y_true:g})²",
            f"L = ({y_pred - y_true:g})²",
            f"L = {loss:g}",
        ]
        return LossResult(loss=loss, loss_type=loss_type, steps=steps)

    # binary cross-entropy — only meaningful for a probability-like prediction
    if not (0.0 < y_pred < 1.0):
        raise DlFoundationsError(
            "Binary cross-entropy needs a prediction strictly between 0 and 1 "
            "(use the sigmoid activation on the neuron producing it)."
        )
    if y_true not in (0.0, 1.0):
        raise DlFoundationsError("Binary cross-entropy needs a true label of exactly 0 or 1.")
    yp = min(max(y_pred, _LOG_EPS), 1 - _LOG_EPS)
    loss = -(y_true * math.log(yp) + (1 - y_true) * math.log(1 - yp))
    steps = [
        "L = −(y·ln(ŷ) + (1−y)·ln(1−ŷ))",
        f"L = −({y_true:g}·ln({y_pred:g}) + {1 - y_true:g}·ln({1 - y_pred:g}))",
        f"L = {loss:g}",
    ]
    return LossResult(loss=loss, loss_type=loss_type, steps=steps)


def _loss_derivative(y_pred: float, y_true: float, loss_type: str) -> float:
    """dL/d(y_pred), the real derivative of the chosen loss."""
    if loss_type == "mse":
        return 2 * (y_pred - y_true)
    # binary cross-entropy
    yp = min(max(y_pred, _LOG_EPS), 1 - _LOG_EPS)
    return -(y_true / yp) + (1 - y_true) / (1 - yp)


@dataclass
class GradientResult:
    dL_dw: list[float]
    dL_db: float
    y_pred: float
    loss: float
    steps: list[str] = field(default_factory=list)


def single_neuron_gradient(
    inputs: list[float],
    weights: list[float],
    bias: float,
    y_true: float,
    activation: str,
    loss_type: str,
) -> GradientResult:
    """The real chain rule for one neuron: dL/dw_i = dL/dŷ × dŷ/dz × dz/dw_i,
    where dz/dw_i = x_i and dz/db = 1. Every derivative used is the actual
    calculus derivative of the chosen activation/loss, evaluated at this
    neuron's actual z — this is the real gradient, not an illustration of
    one (verified against a numerical finite-difference gradient in tests)."""
    _validate_activation(activation)
    _validate_inputs_weights(inputs, weights)
    if loss_type not in LOSSES:
        raise DlFoundationsError(f"Unknown loss '{loss_type}'. Choose one of: {', '.join(LOSSES)}.")
    if loss_type == "binary_crossentropy" and activation != "sigmoid":
        raise DlFoundationsError(
            "Binary cross-entropy's gradient here assumes a sigmoid output neuron — "
            "pick the sigmoid activation, or use MSE loss instead."
        )

    fwd = neuron_forward(inputs, weights, bias, activation)
    z, y_pred = fwd.weighted_sum, fwd.activated_output
    loss_val = compute_loss(y_pred, y_true, loss_type).loss

    dL_dypred = _loss_derivative(y_pred, y_true, loss_type)
    dypred_dz = _activate_derivative(z, activation)
    dL_dz = dL_dypred * dypred_dz

    dL_dw = [dL_dz * x for x in inputs]
    dL_db = dL_dz

    steps = [
        f"Forward: z = {z:g}, ŷ = {activation}(z) = {y_pred:g}, L = {loss_val:g}",
        f"dL/dŷ = {dL_dypred:g}",
        f"dŷ/dz = {activation}'(z) = {dypred_dz:g}",
        f"dL/dz = dL/dŷ × dŷ/dz = {dL_dz:g}",
    ]
    for i, (x, g) in enumerate(zip(inputs, dL_dw)):
        steps.append(f"dL/dw{i + 1} = dL/dz × x{i + 1} = {dL_dz:g} × {x:g} = {g:g}")
    steps.append(f"dL/db = dL/dz × 1 = {dL_db:g}")

    return GradientResult(dL_dw=dL_dw, dL_db=dL_db, y_pred=y_pred, loss=loss_val, steps=steps)


@dataclass
class GradientDescentStep:
    epoch: int
    weights: list[float]
    bias: float
    y_pred: float
    loss: float


@dataclass
class GradientDescentResult:
    steps: list[GradientDescentStep]
    final_weights: list[float]
    final_bias: float
    final_loss: float


def gradient_descent(
    inputs: list[float],
    weights: list[float],
    bias: float,
    y_true: float,
    activation: str,
    loss_type: str,
    learning_rate: float,
    epochs: int,
) -> GradientDescentResult:
    """Runs real gradient descent on one neuron's weights/bias for a fixed
    (inputs, y_true) example — every epoch actually recomputes the forward
    pass, the loss, and the gradient, then genuinely updates w/b by
    -learning_rate * gradient. Nothing here is interpolated between a start
    and end value; each epoch is its own real computation."""
    if learning_rate <= 0:
        raise DlFoundationsError("Learning rate must be greater than 0.")
    if not (1 <= epochs <= MAX_GD_EPOCHS):
        raise DlFoundationsError(f"Epochs must be between 1 and {MAX_GD_EPOCHS}.")
    if loss_type == "binary_crossentropy" and activation != "sigmoid":
        raise DlFoundationsError(
            "Binary cross-entropy gradient descent here assumes a sigmoid output neuron."
        )

    w = list(weights)
    b = bias
    history: list[GradientDescentStep] = []

    for epoch in range(1, epochs + 1):
        grad = single_neuron_gradient(inputs, w, b, y_true, activation, loss_type)
        history.append(
            GradientDescentStep(epoch=epoch, weights=list(w), bias=b, y_pred=grad.y_pred, loss=grad.loss)
        )
        w = [wi - learning_rate * gi for wi, gi in zip(w, grad.dL_dw)]
        b = b - learning_rate * grad.dL_db

    final_fwd = neuron_forward(inputs, w, b, activation)
    final_loss = compute_loss(final_fwd.activated_output, y_true, loss_type).loss

    return GradientDescentResult(steps=history, final_weights=w, final_bias=b, final_loss=final_loss)
