"""
Two worked numerical examples from Module 2 of the user's uploaded DL
syllabus (Neural_network_chap-2.docx, "Introduction To Neural Network" and
"Backpropagation in Neural Network"): the email-classification forward
pass, and the backpropagation worked example. Both are reproduced from
the document's own diagrams and numbers (the backprop network's weights
come directly from its labeled diagram: x1=0.35, x2=0.7, w1,1=w2,1=0.2,
w1,2=w2,2=0.3, w1,3=0.3, w2,3=0.9 — extracted from the embedded image,
since Word doesn't store diagram labels as searchable text) and are
checked against those numbers in tests.

Both are generalized beyond the textbook's fixed numbers, so a student
can try their own inputs/weights rather than only replaying one example.
The backprop network additionally supports running many real steps in a
row (the source document only hand-works a single iteration), so a
student can watch the same small network actually converge.

A note on precision: the source document rounds intermediate values to
2 decimal places at each step (a common textbook convenience for hand
calculation). This module carries full floating-point precision
throughout, so its results are consistently accurate but land a few
thousandths away from the document's own rounded numbers at the later
steps — the method is identical, only the rounding discipline differs.
This is disclosed in the frontend UI, not silently smoothed over.
"""
from dataclasses import dataclass, field

from app.algorithms.activation_functions import activate


class NNModule2Error(ValueError):
    """Raised for invalid input to a Module 2 worked-example calculation."""


# ---------------------------------------------------------------------------
# Email classification example (nn_chap2, "How Neurons Process Data in a
# Neural Network") — 3 binary keyword-presence inputs -> 2 ReLU hidden
# neurons -> 1 sigmoid output neuron (no biases in the source example).
# ---------------------------------------------------------------------------

EMAIL_KEYWORDS = ["free", "win", "offer"]
EMAIL_DEFAULT_H1_WEIGHTS = [0.5, -0.2, 0.3]
EMAIL_DEFAULT_H2_WEIGHTS = [0.4, 0.1, -0.5]
EMAIL_DEFAULT_OUTPUT_WEIGHTS = [0.7, 0.2]


@dataclass
class EmailClassificationResult:
    h1_weighted_sum: float
    h1_output: float
    h2_weighted_sum: float
    h2_output: float
    output_weighted_sum: float
    output_probability: float
    is_spam: bool
    steps: list[str] = field(default_factory=list)


def classify_email(
    inputs: list[float],
    h1_weights: list[float] | None = None,
    h2_weights: list[float] | None = None,
    output_weights: list[float] | None = None,
) -> EmailClassificationResult:
    h1_weights = list(h1_weights) if h1_weights else list(EMAIL_DEFAULT_H1_WEIGHTS)
    h2_weights = list(h2_weights) if h2_weights else list(EMAIL_DEFAULT_H2_WEIGHTS)
    output_weights = list(output_weights) if output_weights else list(EMAIL_DEFAULT_OUTPUT_WEIGHTS)

    if len(inputs) != 3:
        raise NNModule2Error("This example's network takes exactly 3 inputs (one per keyword: free, win, offer).")
    if len(h1_weights) != 3 or len(h2_weights) != 3:
        raise NNModule2Error("Hidden-layer weight vectors must have length 3.")
    if len(output_weights) != 2:
        raise NNModule2Error("Output-layer weight vector must have length 2.")

    h1_ws = sum(w * x for w, x in zip(h1_weights, inputs))
    h1_out = activate(h1_ws, "relu")
    h2_ws = sum(w * x for w, x in zip(h2_weights, inputs))
    h2_out = activate(h2_ws, "relu")

    out_ws = output_weights[0] * h1_out + output_weights[1] * h2_out
    prob = activate(out_ws, "sigmoid")

    steps = [
        "H1 weighted sum = " + " + ".join(f"({w:g})({x:g})" for w, x in zip(h1_weights, inputs)) + f" = {h1_ws:g}",
        f"H1 output = ReLU({h1_ws:g}) = {h1_out:g}",
        "H2 weighted sum = " + " + ".join(f"({w:g})({x:g})" for w, x in zip(h2_weights, inputs)) + f" = {h2_ws:g}",
        f"H2 output = ReLU({h2_ws:g}) = {h2_out:g}",
        f"Output weighted sum = ({output_weights[0]:g})({h1_out:g}) + ({output_weights[1]:g})({h2_out:g}) = {out_ws:g}",
        f"Output probability = sigmoid({out_ws:g}) ≈ {prob:.4f}",
        f"Classification: {'SPAM' if prob > 0.5 else 'NOT SPAM'} (probability {'>' if prob > 0.5 else '<='} 0.5)",
    ]
    return EmailClassificationResult(
        h1_weighted_sum=h1_ws,
        h1_output=h1_out,
        h2_weighted_sum=h2_ws,
        h2_output=h2_out,
        output_weighted_sum=out_ws,
        output_probability=prob,
        is_spam=prob > 0.5,
        steps=steps,
    )


# ---------------------------------------------------------------------------
# Backpropagation worked example (nn_chap2, "Backpropagation in Neural
# Network") — 2 inputs -> 2 sigmoid hidden neurons (h1, h2) -> 1 sigmoid
# output neuron (O3), no biases, exactly as labeled in the source
# document's own network diagram.
# ---------------------------------------------------------------------------


@dataclass
class BackpropNetwork:
    w13: float  # x1 -> h1
    w23: float  # x2 -> h1
    w14: float  # x1 -> h2
    w24: float  # x2 -> h2
    w35: float  # h1 -> output
    w45: float  # h2 -> output

    def as_dict(self) -> dict:
        return {"w13": self.w13, "w23": self.w23, "w14": self.w14, "w24": self.w24, "w35": self.w35, "w45": self.w45}


DEFAULT_BACKPROP_NETWORK = BackpropNetwork(w13=0.2, w23=0.2, w14=0.3, w24=0.3, w35=0.3, w45=0.9)
DEFAULT_BACKPROP_X1 = 0.35
DEFAULT_BACKPROP_X2 = 0.7
DEFAULT_BACKPROP_TARGET = 0.5
DEFAULT_BACKPROP_LR = 1.0
MAX_BACKPROP_STEPS = 500


@dataclass
class BackpropStepResult:
    a3: float
    y3: float
    a4: float
    y4: float
    a5: float
    y5: float
    error: float
    delta5: float
    delta3: float
    delta4: float
    updated_network: BackpropNetwork
    steps: list[str] = field(default_factory=list)


def backprop_step(x1: float, x2: float, target: float, learning_rate: float, network: BackpropNetwork) -> BackpropStepResult:
    """One real forward + backward pass through the exact 2-2-1 sigmoid
    network diagrammed in the user's Module 2 document. Generalized to
    any weights/inputs/target/learning-rate, verified in tests to land
    within a few thousandths of the document's own (rounded) worked
    numbers."""
    a3 = network.w13 * x1 + network.w23 * x2
    y3 = activate(a3, "sigmoid")
    a4 = network.w14 * x1 + network.w24 * x2
    y4 = activate(a4, "sigmoid")
    a5 = network.w35 * y3 + network.w45 * y4
    y5 = activate(a5, "sigmoid")

    error = target - y5
    delta5 = y5 * (1 - y5) * error
    delta3 = y3 * (1 - y3) * (network.w35 * delta5)
    delta4 = y4 * (1 - y4) * (network.w45 * delta5)

    new_w35 = network.w35 + learning_rate * delta5 * y3
    new_w45 = network.w45 + learning_rate * delta5 * y4
    new_w13 = network.w13 + learning_rate * delta3 * x1
    new_w23 = network.w23 + learning_rate * delta3 * x2
    new_w14 = network.w14 + learning_rate * delta4 * x1
    new_w24 = network.w24 + learning_rate * delta4 * x2

    updated = BackpropNetwork(w13=new_w13, w23=new_w23, w14=new_w14, w24=new_w24, w35=new_w35, w45=new_w45)

    steps = [
        f"a(h1) = w13·x1 + w23·x2 = ({network.w13:g})({x1:g}) + ({network.w23:g})({x2:g}) = {a3:.4f}",
        f"y(h1) = sigmoid({a3:.4f}) = {y3:.4f}",
        f"a(h2) = w14·x1 + w24·x2 = ({network.w14:g})({x1:g}) + ({network.w24:g})({x2:g}) = {a4:.4f}",
        f"y(h2) = sigmoid({a4:.4f}) = {y4:.4f}",
        f"a(out) = w35·y(h1) + w45·y(h2) = ({network.w35:g})({y3:.4f}) + ({network.w45:g})({y4:.4f}) = {a5:.4f}",
        f"y(out) = sigmoid({a5:.4f}) = {y5:.4f}",
        f"error = target − y(out) = {target:g} − {y5:.4f} = {error:.4f}",
        f"δ(out) = y(out)(1−y(out))(error) = {delta5:.4f}",
        f"δ(h1) = y(h1)(1−y(h1))(w35·δ(out)) = {delta3:.4f}",
        f"δ(h2) = y(h2)(1−y(h2))(w45·δ(out)) = {delta4:.4f}",
        f"w35 ← {network.w35:g} + ({learning_rate:g})({delta5:.4f})({y3:.4f}) = {new_w35:.4f}",
        f"w45 ← {network.w45:g} + ({learning_rate:g})({delta5:.4f})({y4:.4f}) = {new_w45:.4f}",
        f"w13 ← {network.w13:g} + ({learning_rate:g})({delta3:.4f})({x1:g}) = {new_w13:.4f}",
        f"w23 ← {network.w23:g} + ({learning_rate:g})({delta3:.4f})({x2:g}) = {new_w23:.4f}",
        f"w14 ← {network.w14:g} + ({learning_rate:g})({delta4:.4f})({x1:g}) = {new_w14:.4f}",
        f"w24 ← {network.w24:g} + ({learning_rate:g})({delta4:.4f})({x2:g}) = {new_w24:.4f}",
    ]
    return BackpropStepResult(
        a3=a3, y3=y3, a4=a4, y4=y4, a5=a5, y5=y5,
        error=error, delta5=delta5, delta3=delta3, delta4=delta4,
        updated_network=updated, steps=steps,
    )


@dataclass
class BackpropTrainResult:
    history: list[BackpropStepResult]
    final_network: BackpropNetwork
    final_output: float
    final_error: float


def backprop_train(
    x1: float, x2: float, target: float, learning_rate: float, network: BackpropNetwork, num_steps: int
) -> BackpropTrainResult:
    """Repeats backprop_step for real, num_steps times, on the SAME single
    training example — this is what the textbook's single hand-worked
    iteration only gestures at ('this process is continued until the
    actual output is gained'). Capped at MAX_BACKPROP_STEPS."""
    if num_steps < 1:
        raise NNModule2Error("num_steps must be at least 1.")
    num_steps = min(num_steps, MAX_BACKPROP_STEPS)
    current = network
    history: list[BackpropStepResult] = []
    for _ in range(num_steps):
        result = backprop_step(x1, x2, target, learning_rate, current)
        history.append(result)
        current = result.updated_network
    last = history[-1]
    return BackpropTrainResult(history=history, final_network=current, final_output=last.y5, final_error=last.error)
