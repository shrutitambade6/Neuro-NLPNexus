"""
McCulloch-Pitts Neuron, Thresholding Logic, the Perceptron, and the
Perceptron Learning Algorithm (PLA) — Module 1 of the user's uploaded DL
syllabus (chap_01.docx, "McCulloch-Pitts Neuron").

This is a separate, self-contained module from activation_functions.py /
dl_foundations.py on purpose: the hard step/threshold function used here
is a genuinely different (older, non-differentiable) activation than the
modern sigmoid/tanh/ReLU family DL Foundations already covers, and the
Perceptron Learning Algorithm is a distinct discrete weight-update rule
— not gradient descent — so reusing dl_foundations.py's gradient-based
update here would misrepresent the actual historical algorithm the
source material teaches.

Every function computes real arithmetic on whatever numbers are given —
nothing here is a lookup table. The source document's own worked examples
(1.5 M-P neuron AND-gate check, 2.3-2.5 AND/OR/NOT via thresholding, 3.6
perceptron forward pass, 4.4 PLA weight-update numeric example) are used
as this module's default example values and are checked against exactly
in tests, so the frontend's "worked example" reproduces the uploaded
document, not an invented one.
"""
from dataclasses import dataclass, field


class PerceptronFoundationsError(ValueError):
    """Raised for invalid input to a Module 1 (Perceptron Foundations) calculation."""


def _check_lengths(inputs: list[float], weights: list[float]) -> None:
    if not inputs:
        raise PerceptronFoundationsError("Provide at least one input.")
    if len(inputs) != len(weights):
        raise PerceptronFoundationsError(
            f"Got {len(inputs)} input(s) but {len(weights)} weight(s) — they must match 1:1."
        )


def step_function(z: float, threshold: float = 0.0) -> int:
    """f(z) = 1 if z >= threshold else 0 — chap_01 section 2.2 (Step Function)."""
    return 1 if z >= threshold else 0


@dataclass
class MPNeuronResult:
    weighted_sum: float
    threshold: float
    fired: bool
    steps: list[str] = field(default_factory=list)


def mp_neuron(inputs: list[float], weights: list[float], threshold: float) -> MPNeuronResult:
    """McCulloch-Pitts neuron (chap_01 1.3/1.4): y = 1 if sum(w_i*x_i) >=
    threshold, else 0. Inputs are conventionally binary per the source
    material, but this doesn't hard-enforce that, matching how
    dl_foundations.py's own neuron_forward() generalizes."""
    _check_lengths(inputs, weights)
    s = sum(w * x for w, x in zip(weights, inputs))
    fired = s >= threshold
    steps = [
        "S = " + " + ".join(f"({w:g})({x:g})" for w, x in zip(weights, inputs)) + f" = {s:g}",
        f"Compare to threshold θ = {threshold:g}: S {'>=' if fired else '<'} θ",
        f"y = {1 if fired else 0}",
    ]
    return MPNeuronResult(weighted_sum=s, threshold=threshold, fired=fired, steps=steps)


# The exact weight/threshold choices chap_01 sections 2.3-2.5 use to
# realize each logic gate with a single M-P neuron.
GATE_PRESETS: dict[str, dict] = {
    "AND": {"weights": [1.0, 1.0], "threshold": 2.0},
    "OR": {"weights": [1.0, 1.0], "threshold": 1.0},
    "NOT": {"weights": [-1.0], "threshold": 0.0},
}


def truth_table(gate: str) -> list[dict]:
    """A real truth table — computed by actually running mp_neuron for
    every input combination, never hardcoded — for AND/OR (2-input) or
    NOT (1-input), using chap_01's own weight/threshold choices."""
    if gate not in GATE_PRESETS:
        raise PerceptronFoundationsError(f"Unknown gate '{gate}'. Choose one of: {', '.join(GATE_PRESETS)}.")
    preset = GATE_PRESETS[gate]
    n_inputs = len(preset["weights"])
    rows = []
    for combo in range(2**n_inputs):
        inputs = [float((combo >> i) & 1) for i in reversed(range(n_inputs))]
        result = mp_neuron(inputs, preset["weights"], preset["threshold"])
        rows.append({"inputs": [int(x) for x in inputs], "output": 1 if result.fired else 0})
    return rows


@dataclass
class PerceptronForwardResult:
    weighted_sum: float
    output: int
    steps: list[str] = field(default_factory=list)


def perceptron_forward(inputs: list[float], weights: list[float], bias: float) -> PerceptronForwardResult:
    """z = w.x + b ; y = step(z) — chap_01 sections 3.2 and 3.6."""
    _check_lengths(inputs, weights)
    z = sum(w * x for w, x in zip(weights, inputs)) + bias
    y = step_function(z)
    steps = [
        "z = " + " + ".join(f"({w:g})({x:g})" for w, x in zip(weights, inputs)) + f" + ({bias:g}) = {z:g}",
        f"y = step({z:g}) = {y}",
    ]
    return PerceptronForwardResult(weighted_sum=z, output=y, steps=steps)


@dataclass
class PLAStepResult:
    weighted_sum: float
    prediction: int
    error: int
    updated_weights: list[float]
    updated_bias: float
    steps: list[str] = field(default_factory=list)


def perceptron_learning_step(
    inputs: list[float], weights: list[float], bias: float, target: int, learning_rate: float
) -> PLAStepResult:
    """One real step of the Perceptron Learning Algorithm — chap_01
    section 4.2/4.3: z = w.x + b, y = step(z), e = t - y,
    w_i <- w_i + lr*e*x_i, b <- b + lr*e. Reproduces the doc's own
    section 4.4 numeric example exactly when called with its exact
    inputs (checked in tests)."""
    _check_lengths(inputs, weights)
    if target not in (0, 1):
        raise PerceptronFoundationsError("Target must be 0 or 1.")

    z = sum(w * x for w, x in zip(weights, inputs)) + bias
    y = step_function(z)
    e = target - y
    new_weights = [w + learning_rate * e * x for w, x in zip(weights, inputs)]
    new_bias = bias + learning_rate * e

    steps = (
        [
            "z = " + " + ".join(f"({w:g})({x:g})" for w, x in zip(weights, inputs)) + f" + ({bias:g}) = {z:g}",
            f"y = step({z:g}) = {y}",
            f"error e = t - y = {target} - {y} = {e}",
        ]
        + [
            f"w{i + 1} ← {weights[i]:g} + ({learning_rate:g})({e})({inputs[i]:g}) = {new_weights[i]:g}"
            for i in range(len(weights))
        ]
        + [f"b ← {bias:g} + ({learning_rate:g})({e}) = {new_bias:g}"]
    )
    return PLAStepResult(
        weighted_sum=z, prediction=y, error=e, updated_weights=new_weights, updated_bias=new_bias, steps=steps
    )


@dataclass
class PLATrainResult:
    history: list[PLAStepResult]
    final_weights: list[float]
    final_bias: float
    converged: bool
    epochs_run: int


MAX_PLA_EPOCHS = 100


def perceptron_learning_train(
    training_data: list[tuple[list[float], int]],
    initial_weights: list[float],
    initial_bias: float,
    learning_rate: float,
    max_epochs: int = 20,
) -> PLATrainResult:
    """Repeatedly runs perceptron_learning_step over the whole training
    set until every example is classified correctly in one full pass
    (converged) or max_epochs is reached — a real, if small, training
    loop, not a canned animation. Only converges at all for linearly
    separable data (chap_01 4.5) — e.g. AND/OR/NOT, never XOR."""
    if not training_data:
        raise PerceptronFoundationsError("Provide at least one training example.")
    max_epochs = min(max_epochs, MAX_PLA_EPOCHS)
    weights = list(initial_weights)
    bias = initial_bias
    history: list[PLAStepResult] = []
    converged = False
    epochs_run = 0
    for _epoch in range(max_epochs):
        epochs_run += 1
        epoch_errors = 0
        for inputs, target in training_data:
            step = perceptron_learning_step(inputs, weights, bias, target, learning_rate)
            history.append(step)
            weights = step.updated_weights
            bias = step.updated_bias
            if step.error != 0:
                epoch_errors += 1
        if epoch_errors == 0:
            converged = True
            break
    return PLATrainResult(
        history=history, final_weights=weights, final_bias=bias, converged=converged, epochs_run=epochs_run
    )
