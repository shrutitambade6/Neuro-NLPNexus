"""
RNN & LSTM Lab — real recurrent forward passes over a short sequence: a
simple (Elman) RNN's hidden-state recurrence, and a full LSTM cell's four
real gates (forget, input, candidate, output). Every hidden state, cell
state, and gate value below is genuinely computed step by step from the
sequence and the (randomly initialized, real) weights given — nothing here
is an animation interpolated between a start and end state. Weights are
random, not trained, the same honest scope as the Neural Network
Playground and the CNN Lab's dense head: this lab is about how recurrence
and gating actually compute, not about a trained model's learned weights.

Reuses the shared pointwise activation math from activation_functions.py
(sigmoid/tanh) rather than reimplementing it, and both `rnn_forward` and
`lstm_forward` are cross-checked in tests against DL Foundations'
single-neuron `neuron_forward` at t=1 with a zeroed initial hidden/cell
state, where the recurrence has nothing to add and a gate collapses to a
plain single neuron.
"""
import random
from dataclasses import dataclass, field

from app.algorithms.activation_functions import ActivationFunctionsError, activate, softmax

MAX_SEQ_LEN = 8
MAX_INPUT_SIZE = 4
MAX_HIDDEN_SIZE = 6
MAX_OUTPUT_SIZE = 4
WEIGHT_INIT_RANGE = 1.0


class RnnError(ValueError):
    """Raised for invalid input to an RNN/LSTM-lab calculation."""


def _rand_matrix(rng: random.Random, rows: int, cols: int) -> list[list[float]]:
    return [[rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(cols)] for _ in range(rows)]


def _rand_vector(rng: random.Random, n: int) -> list[float]:
    return [rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(n)]


def _matvec(matrix: list[list[float]], vec: list[float]) -> list[float]:
    return [sum(w * v for w, v in zip(row, vec)) for row in matrix]


def _vec_add(*vectors: list[float]) -> list[float]:
    return [sum(vals) for vals in zip(*vectors)]


def _activate_vec(values: list[float], name: str) -> list[float]:
    try:
        return [activate(v, name) for v in values]
    except ActivationFunctionsError as exc:
        raise RnnError(str(exc)) from exc


def _validate_dims(input_size: int, hidden_size: int, output_size: int | None = None) -> None:
    if not (1 <= input_size <= MAX_INPUT_SIZE):
        raise RnnError(f"Input size must be between 1 and {MAX_INPUT_SIZE}.")
    if not (1 <= hidden_size <= MAX_HIDDEN_SIZE):
        raise RnnError(f"Hidden size must be between 1 and {MAX_HIDDEN_SIZE}.")
    if output_size is not None and not (1 <= output_size <= MAX_OUTPUT_SIZE):
        raise RnnError(f"Output size must be between 1 and {MAX_OUTPUT_SIZE}.")


def _validate_sequence(sequence: list[list[float]], input_size: int) -> None:
    if not sequence:
        raise RnnError("Provide at least one timestep.")
    if len(sequence) > MAX_SEQ_LEN:
        raise RnnError(f"At most {MAX_SEQ_LEN} timesteps are supported here.")
    for i, x in enumerate(sequence):
        if len(x) != input_size:
            raise RnnError(f"Timestep {i + 1}: expected {input_size} value(s), got {len(x)}.")


# ---------------------------------------------------------------- simple RNN

@dataclass
class RnnWeights:
    w_xh: list[list[float]]  # hidden_size x input_size
    w_hh: list[list[float]]  # hidden_size x hidden_size
    b_h: list[float]
    w_hy: list[list[float]]  # output_size x hidden_size
    b_y: list[float]


def random_rnn_weights(input_size: int, hidden_size: int, output_size: int, seed: int | None = None) -> RnnWeights:
    _validate_dims(input_size, hidden_size, output_size)
    rng = random.Random(seed)
    return RnnWeights(
        w_xh=_rand_matrix(rng, hidden_size, input_size),
        w_hh=_rand_matrix(rng, hidden_size, hidden_size),
        b_h=_rand_vector(rng, hidden_size),
        w_hy=_rand_matrix(rng, output_size, hidden_size),
        b_y=_rand_vector(rng, output_size),
    )


def _validate_rnn_shape(weights: RnnWeights) -> tuple[int, int, int]:
    hidden_size = len(weights.b_h)
    output_size = len(weights.b_y)
    if len(weights.w_xh) != hidden_size or len(weights.w_hh) != hidden_size or len(weights.w_hh[0]) != hidden_size:
        raise RnnError("RNN weight shapes are inconsistent (w_xh/w_hh/b_h must all agree on hidden size).")
    if len(weights.w_hy) != output_size or len(weights.w_hy[0]) != hidden_size:
        raise RnnError("w_hy must be output_size x hidden_size.")
    input_size = len(weights.w_xh[0])
    return input_size, hidden_size, output_size


@dataclass
class RnnStepRecord:
    x: list[float]
    z_h: list[float]
    h: list[float]
    y: list[float]


@dataclass
class RnnForwardResult:
    steps: list[RnnStepRecord] = field(default_factory=list)
    final_hidden: list[float] = field(default_factory=list)


def rnn_forward(
    weights: RnnWeights,
    sequence: list[list[float]],
    activation: str,
    output_activation: str,
) -> RnnForwardResult:
    """A real Elman-RNN forward pass: at every timestep, the real previous
    hidden state genuinely feeds back in (h_t = activation(Wxh·x_t +
    Whh·h_{t-1} + b_h)) before producing that step's real output — the
    actual recurrence, not a per-step-independent calculation relabeled as
    'recurrent'."""
    input_size, hidden_size, _ = _validate_rnn_shape(weights)
    _validate_sequence(sequence, input_size)

    h = [0.0] * hidden_size
    steps: list[RnnStepRecord] = []
    for x in sequence:
        z_h = _vec_add(_matvec(weights.w_xh, x), _matvec(weights.w_hh, h), weights.b_h)
        h = _activate_vec(z_h, activation)
        z_y = _vec_add(_matvec(weights.w_hy, h), weights.b_y)
        y = softmax(z_y) if output_activation == "softmax" else _activate_vec(z_y, output_activation)
        steps.append(RnnStepRecord(x=list(x), z_h=z_h, h=list(h), y=y))

    return RnnForwardResult(steps=steps, final_hidden=h)


# --------------------------------------------------------------------- LSTM

@dataclass
class LstmWeights:
    w_f: list[list[float]]; u_f: list[list[float]]; b_f: list[float]
    w_i: list[list[float]]; u_i: list[list[float]]; b_i: list[float]
    w_c: list[list[float]]; u_c: list[list[float]]; b_c: list[float]
    w_o: list[list[float]]; u_o: list[list[float]]; b_o: list[float]


def random_lstm_weights(input_size: int, hidden_size: int, seed: int | None = None) -> LstmWeights:
    _validate_dims(input_size, hidden_size)
    rng = random.Random(seed)

    def gate() -> tuple[list[list[float]], list[list[float]], list[float]]:
        return (_rand_matrix(rng, hidden_size, input_size), _rand_matrix(rng, hidden_size, hidden_size), _rand_vector(rng, hidden_size))

    w_f, u_f, b_f = gate()
    w_i, u_i, b_i = gate()
    w_c, u_c, b_c = gate()
    w_o, u_o, b_o = gate()
    return LstmWeights(
        w_f=w_f, u_f=u_f, b_f=b_f,
        w_i=w_i, u_i=u_i, b_i=b_i,
        w_c=w_c, u_c=u_c, b_c=b_c,
        w_o=w_o, u_o=u_o, b_o=b_o,
    )


def _validate_lstm_shape(weights: LstmWeights) -> tuple[int, int]:
    hidden_size = len(weights.b_f)
    for w, u, b in (
        (weights.w_f, weights.u_f, weights.b_f),
        (weights.w_i, weights.u_i, weights.b_i),
        (weights.w_c, weights.u_c, weights.b_c),
        (weights.w_o, weights.u_o, weights.b_o),
    ):
        if len(w) != hidden_size or len(u) != hidden_size or len(u[0]) != hidden_size or len(b) != hidden_size:
            raise RnnError("LSTM gate weight shapes are inconsistent — every gate must agree on hidden size.")
    input_size = len(weights.w_f[0])
    for w in (weights.w_i, weights.w_c, weights.w_o):
        if len(w[0]) != input_size:
            raise RnnError("LSTM gates must all agree on input size.")
    return input_size, hidden_size


@dataclass
class LstmStepRecord:
    x: list[float]
    forget_gate: list[float]
    input_gate: list[float]
    candidate: list[float]
    output_gate: list[float]
    cell_state: list[float]
    hidden_state: list[float]


@dataclass
class LstmForwardResult:
    steps: list[LstmStepRecord] = field(default_factory=list)
    final_hidden: list[float] = field(default_factory=list)
    final_cell: list[float] = field(default_factory=list)


def lstm_forward(weights: LstmWeights, sequence: list[list[float]]) -> LstmForwardResult:
    """A real LSTM cell's forward pass: at every timestep, all four gates
    (forget, input, candidate, output) are genuinely computed from the real
    previous hidden state and the real previous cell state, the cell state
    is really updated (c_t = f_t⊙c_{t-1} + i_t⊙c̃_t), and the hidden state is
    really derived from the updated cell state (h_t = o_t⊙tanh(c_t)) — the
    actual LSTM equations, evaluated for real at every step."""
    input_size, hidden_size = _validate_lstm_shape(weights)
    _validate_sequence(sequence, input_size)

    h = [0.0] * hidden_size
    c = [0.0] * hidden_size
    steps: list[LstmStepRecord] = []
    for x in sequence:
        f = _activate_vec(_vec_add(_matvec(weights.w_f, x), _matvec(weights.u_f, h), weights.b_f), "sigmoid")
        i = _activate_vec(_vec_add(_matvec(weights.w_i, x), _matvec(weights.u_i, h), weights.b_i), "sigmoid")
        c_tilde = _activate_vec(_vec_add(_matvec(weights.w_c, x), _matvec(weights.u_c, h), weights.b_c), "tanh")
        o = _activate_vec(_vec_add(_matvec(weights.w_o, x), _matvec(weights.u_o, h), weights.b_o), "sigmoid")

        c = [fi * ci + ii * cti for fi, ci, ii, cti in zip(f, c, i, c_tilde)]
        tanh_c = _activate_vec(c, "tanh")
        h = [oi * tci for oi, tci in zip(o, tanh_c)]

        steps.append(
            LstmStepRecord(
                x=list(x), forget_gate=f, input_gate=i, candidate=c_tilde,
                output_gate=o, cell_state=list(c), hidden_state=list(h),
            )
        )

    return LstmForwardResult(steps=steps, final_hidden=h, final_cell=c)
