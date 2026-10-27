"""
Deep Learning Challenges — a fixed set of real challenge questions whose
"correct answer" is never hand-typed: every answer_json seeded into the
database is computed once, at seed time, by genuinely calling the same
real algorithm functions the DL labs themselves use (neuron_forward,
softmax, convolve2d, pool2d, rnn_forward, scaled_dot_product_attention).
If any of those functions' math ever changes, re-seeding regenerates
correct answers automatically — there is no separately-maintained "answer
key" that could drift out of sync with the real implementation.

Answer checking allows a numeric tolerance (rounding/typing a slightly
imprecise decimal shouldn't fail a student who got the real math right),
applied recursively to scalars, vectors, and matrices alike.
"""
from typing import Any

from app.algorithms.activation_functions import activate, softmax
from app.algorithms.attention import ProjectionWeights, scaled_dot_product_attention
from app.algorithms.cnn import convolve2d, pool2d
from app.algorithms.dl_foundations import neuron_forward
from app.algorithms.rnn import RnnWeights, rnn_forward

DEFAULT_TOLERANCE = 0.01


class ChallengeError(ValueError):
    """Raised for invalid input to a challenge calculation."""


def compute_dl_challenge_answer(prompt: dict[str, Any]) -> Any:
    """Genuinely (re)computes the correct answer for a DL challenge prompt
    by calling the real algorithm function it describes — used both at
    seed time (to populate answer_json) and available for re-verification
    if the seed data is ever regenerated."""
    kind = prompt["type"]

    if kind == "neuron_forward":
        result = neuron_forward(prompt["inputs"], prompt["weights"], prompt["bias"], prompt["activation"])
        return round(result.activated_output, 6)

    if kind == "activation_point":
        return round(activate(prompt["z"], prompt["activation"]), 6)

    if kind == "softmax":
        return [round(v, 6) for v in softmax(prompt["values"])]

    if kind == "convolution":
        fm = convolve2d(prompt["image"], prompt["kernel"], prompt.get("stride", 1))
        return [[round(v, 6) for v in row] for row in fm]

    if kind == "pooling":
        pooled = pool2d(prompt["matrix"], prompt["pool_type"], prompt["size"], prompt["stride"])
        return [[round(v, 6) for v in row] for row in pooled]

    if kind == "rnn_hidden_step":
        weights = RnnWeights(
            w_xh=prompt["w_xh"], w_hh=prompt["w_hh"], b_h=prompt["b_h"],
            w_hy=[[1.0] * len(prompt["b_h"])], b_y=[0.0],
        )
        result = rnn_forward(weights, [prompt["x"]], prompt["activation"], "linear")
        return [round(v, 6) for v in result.steps[0].h]

    if kind == "attention_weight":
        weights = ProjectionWeights(w_q=prompt["w_q"], w_k=prompt["w_k"], w_v=prompt["w_v"])
        result = scaled_dot_product_attention(prompt["embeddings"], weights)
        row, col = prompt["row"], prompt["col"]
        return round(result.attention_weights[row][col], 6)

    raise ChallengeError(f"Unknown challenge prompt type '{kind}'.")


def _numbers_close(a: float, b: float, tolerance: float) -> bool:
    return abs(a - b) <= tolerance


def check_answer(submitted: Any, correct: Any, tolerance: float = DEFAULT_TOLERANCE) -> bool:
    """Recursively compares a submitted answer to the real computed
    correct answer — scalars within a tolerance (so '0.73' still counts as
    right against a true value of 0.7304), lists/matrices element-wise."""
    if isinstance(correct, (int, float)) and not isinstance(correct, bool):
        try:
            return _numbers_close(float(submitted), float(correct), tolerance)
        except (TypeError, ValueError):
            return False
    if isinstance(correct, list):
        if not isinstance(submitted, list) or len(submitted) != len(correct):
            return False
        return all(check_answer(s, c, tolerance) for s, c in zip(submitted, correct))
    return submitted == correct


# --------------------------------------------------------- seed challenge set

DL_CHALLENGE_SPECS: list[dict[str, Any]] = [
    {
        "slug": "dl-neuron-sigmoid",
        "module": "dl-foundations",
        "difficulty": "easy",
        "xp_value": 10,
        "prompt": {
            "type": "neuron_forward",
            "description": "A neuron has inputs [1, 2], weights [0.5, -0.5], bias 0.1, and a sigmoid activation. What is its output? (to 3 decimals)",
            "inputs": [1, 2], "weights": [0.5, -0.5], "bias": 0.1, "activation": "sigmoid",
        },
    },
    {
        "slug": "dl-activation-relu",
        "module": "dl-foundations",
        "difficulty": "easy",
        "xp_value": 5,
        "prompt": {
            "type": "activation_point",
            "description": "What is relu(-3.5)?",
            "z": -3.5, "activation": "relu",
        },
    },
    {
        "slug": "dl-softmax-three",
        "module": "dl-foundations",
        "difficulty": "medium",
        "xp_value": 15,
        "prompt": {
            "type": "softmax",
            "description": "Compute softmax([1.0, 2.0, 0.5]) — give all three probabilities as a list, each to 3 decimals.",
            "values": [1.0, 2.0, 0.5],
        },
    },
    {
        "slug": "dl-cnn-convolve",
        "module": "cnn",
        "difficulty": "medium",
        "xp_value": 15,
        "prompt": {
            "type": "convolution",
            "description": "Convolve this 4x4 image with the 2x2 kernel [[1,0],[0,1]], stride 1 (valid convolution). Give the resulting 3x3 feature map.",
            "image": [[1, 2, 0, 1], [0, 1, 3, 2], [2, 0, 1, 1], [1, 1, 0, 2]],
            "kernel": [[1, 0], [0, 1]],
            "stride": 1,
        },
    },
    {
        "slug": "dl-cnn-maxpool",
        "module": "cnn",
        "difficulty": "medium",
        "xp_value": 15,
        "prompt": {
            "type": "pooling",
            "description": "Max-pool this 4x4 matrix with a 2x2 window, stride 2. Give the resulting 2x2 matrix.",
            "matrix": [[1, 3, 2, 4], [5, 6, 1, 2], [7, 8, 9, 0], [1, 2, 3, 4]],
            "pool_type": "max", "size": 2, "stride": 2,
        },
    },
    {
        "slug": "dl-rnn-first-step",
        "module": "rnn",
        "difficulty": "hard",
        "xp_value": 20,
        "prompt": {
            "type": "rnn_hidden_step",
            "description": (
                "A simple RNN's hidden layer has w_xh=[[0.5,-0.3]], w_hh=[[0.0]], b_h=[0.2], "
                "tanh activation. With hidden state starting at 0, what is h_1 for x_1=[1, 2]? "
                "(a single-value list, to 3 decimals)"
            ),
            "w_xh": [[0.5, -0.3]], "w_hh": [[0.0]], "b_h": [0.2], "x": [1, 2], "activation": "tanh",
        },
    },
    {
        "slug": "dl-attention-weight",
        "module": "attention",
        "difficulty": "hard",
        "xp_value": 25,
        "prompt": {
            "type": "attention_weight",
            "description": (
                "With identity Q/K/V projections over embeddings [[1,0],[0,1]], what is the "
                "attention weight (row 0, col 1) — i.e. how much token 0 attends to token 1? "
                "(to 3 decimals)"
            ),
            "embeddings": [[1.0, 0.0], [0.0, 1.0]],
            "w_q": [[1.0, 0.0], [0.0, 1.0]], "w_k": [[1.0, 0.0], [0.0, 1.0]], "w_v": [[1.0, 0.0], [0.0, 1.0]],
            "row": 0, "col": 1,
        },
    },
]
