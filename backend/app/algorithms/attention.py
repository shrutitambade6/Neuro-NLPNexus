"""
Attention & Transformers Lab — real scaled dot-product attention: given a
small sequence of token embeddings and real, randomly initialized Query/
Key/Value projection weights, this computes the actual attention scores
(Q·K^T, scaled by 1/sqrt(d_k)), a real softmax over each row of scores
(reusing activation_functions.softmax, the same function every other DL
lab's softmax comes from), and the real weighted sum of Value vectors that
those attention weights produce. Deliberately scoped to a single attention
head over a hand-sized sequence (3-6 tokens, 2-4 dimensions) so a person
can multiply the matrices by hand and check the backend — the same
"small enough to verify by hand" scope as every other DL lab here. Explicit
about the simplification: real transformers use multiple heads and add
positional encoding; this lab computes one real head's math without
inventing a second one just to look more complete.
"""
import math
import random
from dataclasses import dataclass

from app.algorithms.activation_functions import ActivationFunctionsError, softmax

MIN_SEQ_LEN = 2
MAX_SEQ_LEN = 6
MIN_DIM = 2
MAX_DIM = 4
WEIGHT_INIT_RANGE = 1.0


class AttentionError(ValueError):
    """Raised for invalid input to an attention-lab calculation."""


def _rows_cols(matrix: list[list[float]]) -> tuple[int, int]:
    if not matrix or not matrix[0]:
        raise AttentionError("Matrix must have at least one row and one column.")
    n_cols = len(matrix[0])
    for row in matrix:
        if len(row) != n_cols:
            raise AttentionError("Every row must have the same number of columns.")
    return len(matrix), n_cols


def _validate_embeddings(embeddings: list[list[float]]) -> tuple[int, int]:
    seq_len, dim = _rows_cols(embeddings)
    if not (MIN_SEQ_LEN <= seq_len <= MAX_SEQ_LEN):
        raise AttentionError(f"Sequence length must be between {MIN_SEQ_LEN} and {MAX_SEQ_LEN}, got {seq_len}.")
    if not (MIN_DIM <= dim <= MAX_DIM):
        raise AttentionError(f"Embedding dimension must be between {MIN_DIM} and {MAX_DIM}, got {dim}.")
    return seq_len, dim


def _matmul(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    """a (m x n) @ b (n x p) -> (m x p), real matrix multiplication."""
    if not a or not b:
        raise AttentionError("Both matrices must be non-empty.")
    n = len(a[0])
    if len(b) != n:
        raise AttentionError(f"Matrix shapes don't align for multiplication ({len(a)}x{n} @ {len(b)}x{len(b[0]) if b else 0}).")
    return [[sum(a[i][k] * b[k][j] for k in range(n)) for j in range(len(b[0]))] for i in range(len(a))]


def _transpose(m: list[list[float]]) -> list[list[float]]:
    return [list(col) for col in zip(*m)]


@dataclass
class ProjectionWeights:
    w_q: list[list[float]]  # dim x d_k
    w_k: list[list[float]]  # dim x d_k
    w_v: list[list[float]]  # dim x d_v


def random_projection_weights(dim: int, d_k: int, d_v: int, seed: int | None = None) -> ProjectionWeights:
    if not (MIN_DIM <= dim <= MAX_DIM):
        raise AttentionError(f"Embedding dimension must be between {MIN_DIM} and {MAX_DIM}, got {dim}.")
    if not (1 <= d_k <= MAX_DIM) or not (1 <= d_v <= MAX_DIM):
        raise AttentionError(f"Projection dimensions must be between 1 and {MAX_DIM}.")
    rng = random.Random(seed)

    def mat(rows: int, cols: int) -> list[list[float]]:
        return [[rng.uniform(-WEIGHT_INIT_RANGE, WEIGHT_INIT_RANGE) for _ in range(cols)] for _ in range(rows)]

    return ProjectionWeights(w_q=mat(dim, d_k), w_k=mat(dim, d_k), w_v=mat(dim, d_v))


def _validate_projection_shape(weights: ProjectionWeights, dim: int) -> tuple[int, int]:
    if len(weights.w_q) != dim or len(weights.w_k) != dim or len(weights.w_v) != dim:
        raise AttentionError(f"Projection weights must have {dim} row(s), one per embedding dimension.")
    d_k = len(weights.w_q[0])
    if len(weights.w_k[0]) != d_k:
        raise AttentionError("w_q and w_k must project to the same dimension (d_k) — that's what makes Q·K^T well-defined.")
    d_v = len(weights.w_v[0])
    return d_k, d_v


@dataclass
class AttentionResult:
    queries: list[list[float]]
    keys: list[list[float]]
    values: list[list[float]]
    raw_scores: list[list[float]]     # Q·K^T
    scaled_scores: list[list[float]]  # Q·K^T / sqrt(d_k)
    attention_weights: list[list[float]]  # real softmax over each row
    output: list[list[float]]         # attention_weights @ V


def scaled_dot_product_attention(
    embeddings: list[list[float]], weights: ProjectionWeights
) -> AttentionResult:
    """The real scaled dot-product attention equation: softmax(QK^T /
    sqrt(d_k))V, computed exactly, step by step. Q, K, and V are real
    linear projections of the input embeddings (embeddings @ W_q, etc.) —
    not the embeddings themselves — and every row of attention_weights is a
    genuine probability distribution (via the shared softmax()) over how
    much each token attends to every token, including itself."""
    seq_len, dim = _validate_embeddings(embeddings)
    d_k, d_v = _validate_projection_shape(weights, dim)

    q = _matmul(embeddings, weights.w_q)
    k = _matmul(embeddings, weights.w_k)
    v = _matmul(embeddings, weights.w_v)

    raw_scores = _matmul(q, _transpose(k))
    scale = math.sqrt(d_k)
    scaled_scores = [[cell / scale for cell in row] for row in raw_scores]

    try:
        attn_weights = [softmax(row) for row in scaled_scores]
    except ActivationFunctionsError as exc:
        raise AttentionError(str(exc)) from exc

    output = _matmul(attn_weights, v)

    return AttentionResult(
        queries=q, keys=k, values=v,
        raw_scores=raw_scores, scaled_scores=scaled_scores,
        attention_weights=attn_weights, output=output,
    )
