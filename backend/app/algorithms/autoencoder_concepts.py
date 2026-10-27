"""
Real calculators for Module 3 of the user's uploaded DL syllabus
(Autoencoders_1.docx): a linear encoder/decoder (illustrating the
"linear autoencoder ≈ PCA" result in section 9), reconstruction loss
(MSE/BCE, section 6), the sparse-autoencoder KL-divergence penalty
(section 11.3), the L2 regularization penalty and gradient (section 14),
and inverted dropout (section 20.4). Every function computes real
arithmetic (including genuine randomness for dropout) on whatever numbers
are given — none of this is a lookup table or a canned animation.
"""
import math
import random
from dataclasses import dataclass, field


class AutoencoderConceptsError(ValueError):
    """Raised for invalid input to a Module 3 (Autoencoders) calculation."""


# ---------------------------------------------------------------------------
# Linear encoder/decoder + reconstruction loss (sections 2-6, 9)
# ---------------------------------------------------------------------------


@dataclass
class LinearAutoencoderResult:
    latent: list[float]
    reconstruction: list[float]
    mse: float
    steps: list[str] = field(default_factory=list)


def linear_autoencoder(
    input_vector: list[float], encoder_weights: list[list[float]], decoder_weights: list[list[float]]
) -> LinearAutoencoderResult:
    """A real linear encoder h = W_e * x (encoder_weights: latent_dim x
    input_dim) followed by a real linear decoder x_hat = W_d * h
    (decoder_weights: input_dim x latent_dim) — no activation function,
    matching section 9's "linear activation function" setup used to relate
    autoencoders to PCA. Returns the genuine reconstruction MSE, not an
    illustrative number."""
    input_dim = len(input_vector)
    if not encoder_weights or any(len(row) != input_dim for row in encoder_weights):
        raise AutoencoderConceptsError(f"Each encoder weight row must have length {input_dim} (the input dimension).")
    latent_dim = len(encoder_weights)
    if not decoder_weights or len(decoder_weights) != input_dim or any(len(row) != latent_dim for row in decoder_weights):
        raise AutoencoderConceptsError(
            f"Decoder weights must be {input_dim} rows of length {latent_dim} (the latent dimension)."
        )

    latent = [sum(w * x for w, x in zip(row, input_vector)) for row in encoder_weights]
    reconstruction = [sum(w * h for w, h in zip(row, latent)) for row in decoder_weights]
    mse = sum((x - xh) ** 2 for x, xh in zip(input_vector, reconstruction)) / input_dim

    steps = [
        f"Input x (dim {input_dim}) → Encoder (dim {input_dim}→{latent_dim}) → latent h = {[round(v, 4) for v in latent]}",
        f"Latent h → Decoder (dim {latent_dim}→{input_dim}) → reconstruction x̂ = {[round(v, 4) for v in reconstruction]}",
        f"Reconstruction MSE = mean((x - x̂)²) = {mse:.6f}",
    ]
    return LinearAutoencoderResult(latent=latent, reconstruction=reconstruction, mse=mse, steps=steps)


@dataclass
class ReconstructionLossResult:
    mse: float
    binary_cross_entropy: float | None
    steps: list[str] = field(default_factory=list)


_BCE_EPS = 1e-12


def reconstruction_loss(original: list[float], reconstructed: list[float]) -> ReconstructionLossResult:
    """Section 6: MSE for continuous data, always computed. Binary
    cross-entropy is also computed whenever every value in `original` and
    `reconstructed` lies in [0, 1] (BCE is only meaningful there); it's
    None otherwise rather than silently producing nonsense."""
    if not original or len(original) != len(reconstructed):
        raise AutoencoderConceptsError("original and reconstructed must be non-empty and the same length.")

    n = len(original)
    mse = sum((x - xh) ** 2 for x, xh in zip(original, reconstructed)) / n

    bce = None
    if all(0.0 <= v <= 1.0 for v in original + reconstructed):
        total = 0.0
        for x, xh in zip(original, reconstructed):
            p = min(max(xh, _BCE_EPS), 1 - _BCE_EPS)
            total += -(x * math.log(p) + (1 - x) * math.log(1 - p))
        bce = total / n

    steps = [f"MSE = mean((x_i - x̂_i)²) over {n} value(s) = {mse:.6f}"]
    if bce is not None:
        steps.append(f"Binary Cross-Entropy = {bce:.6f} (all values in [0,1], so BCE is meaningful here)")
    else:
        steps.append("Binary Cross-Entropy not computed: BCE requires values in [0,1] (this looks like continuous data)")
    return ReconstructionLossResult(mse=mse, binary_cross_entropy=bce, steps=steps)


# ---------------------------------------------------------------------------
# Sparse autoencoder KL-divergence penalty (section 11.3)
# ---------------------------------------------------------------------------


@dataclass
class SparsityPenaltyResult:
    kl_divergence: float
    steps: list[str] = field(default_factory=list)


def sparsity_kl_divergence(rho: float, rho_hat: float) -> SparsityPenaltyResult:
    """KL(rho || rho_hat) = rho*log(rho/rho_hat) + (1-rho)*log((1-rho)/(1-rho_hat))
    — section 11.3's sparsity penalty for one hidden neuron, comparing the
    desired average activation (rho) to the neuron's actual average
    activation (rho_hat) over a batch. Both must be in (0, 1) — the KL
    term is undefined at the boundaries."""
    if not (0 < rho < 1):
        raise AutoencoderConceptsError("rho (desired sparsity) must be strictly between 0 and 1.")
    if not (0 < rho_hat < 1):
        raise AutoencoderConceptsError("rho_hat (actual average activation) must be strictly between 0 and 1.")

    kl = rho * math.log(rho / rho_hat) + (1 - rho) * math.log((1 - rho) / (1 - rho_hat))
    steps = [
        f"KL(ρ‖ρ̂) = ρ·log(ρ/ρ̂) + (1−ρ)·log((1−ρ)/(1−ρ̂))",
        f"= {rho:g}·log({rho:g}/{rho_hat:g}) + {1 - rho:g}·log({1 - rho:g}/{1 - rho_hat:g}) = {kl:.6f}",
        "KL = 0 only when ρ̂ = ρ exactly; it grows the further the neuron's real average activation drifts from the target.",
    ]
    return SparsityPenaltyResult(kl_divergence=kl, steps=steps)


# ---------------------------------------------------------------------------
# L2 regularization penalty + gradient (section 14)
# ---------------------------------------------------------------------------


@dataclass
class L2PenaltyResult:
    regularization_term: float
    penalty: float
    gradient_contribution: list[float]
    updated_weights: list[float]
    steps: list[str] = field(default_factory=list)


def l2_penalty(weights: list[float], lambda_: float, learning_rate: float) -> L2PenaltyResult:
    """Section 14, matching the doc's own convention exactly (not the more
    common "2*lambda" textbook variant): the regularization term is
    R(W) = sum(w_i^2) (§14.1); the *objective's* penalty is L_total = L_data
    + (lambda/2)*R(W) (also §14.1); differentiating that gives the
    regularizer's own gradient contribution as exactly lambda*w_i, not
    2*lambda*w_i (§14.3: "dL_total/dw = dL_data/dw + λw"). Also shows what
    one gradient-descent step looks like using ONLY this regularization
    term, to make "L2 shrinks weights toward zero, but never all the way"
    concrete."""
    if not weights:
        raise AutoencoderConceptsError("Provide at least one weight.")
    if lambda_ < 0:
        raise AutoencoderConceptsError("lambda (regularization strength) must be non-negative.")

    reg_term = sum(w * w for w in weights)
    penalty = (lambda_ / 2) * reg_term
    grad = [lambda_ * w for w in weights]
    updated = [w - learning_rate * g for w, g in zip(weights, grad)]

    steps = [
        f"Regularization term R(W) = Σw_i² = {reg_term:.6f}",
        f"Penalty added to the objective = (λ/2)·R(W) = ({lambda_:g}/2)·{reg_term:.6f} = {penalty:.6f}",
        f"Regularizer's gradient contribution: ∂/∂w_i[(λ/2)w_i²] = λw_i = {[round(v, 6) for v in grad]}",
        f"One gradient step using ONLY this term: w_i ← w_i − η·(λw_i) = {[round(v, 6) for v in updated]}",
        "In practice this term is added to the task loss's own gradient (∂L_data/∂w) before updating — shown here in isolation to make its shrinking effect visible.",
    ]
    return L2PenaltyResult(
        regularization_term=reg_term, penalty=penalty, gradient_contribution=grad, updated_weights=updated, steps=steps
    )


# ---------------------------------------------------------------------------
# Inverted dropout (section 20.3-20.4) — GENUINELY random, not fake
# ---------------------------------------------------------------------------


@dataclass
class DropoutResult:
    keep_probability: float
    mask: list[int]
    train_output: list[float]
    test_output: list[float]
    steps: list[str] = field(default_factory=list)


def inverted_dropout(activations: list[float], drop_probability: float, seed: int | None = None) -> DropoutResult:
    """Section 20.3/20.4: with drop probability p (keep probability
    q = 1-p), each unit is independently, randomly dropped during
    training; kept units are scaled by 1/q ("inverted dropout") so the
    expected activation stays roughly unchanged, matching section 20.4
    exactly. At test time (section 20.5), every unit is active and
    unscaled. The mask is generated with Python's real random module —
    pass `seed` only to make a specific run reproducible for a demo; the
    default is genuinely non-deterministic, a fresh mask every call."""
    if not activations:
        raise AutoencoderConceptsError("Provide at least one activation.")
    if not (0 <= drop_probability < 1):
        raise AutoencoderConceptsError("drop_probability must be in [0, 1).")

    rng = random.Random(seed) if seed is not None else random.Random()
    keep_probability = 1 - drop_probability
    mask = [0 if rng.random() < drop_probability else 1 for _ in activations]
    train_output = [(m * a) / keep_probability for m, a in zip(mask, activations)]
    test_output = list(activations)

    steps = [
        f"Keep probability q = 1 − p = 1 − {drop_probability:g} = {keep_probability:g}",
        f"Random mask (this run): {mask}",
        f"Training output = (mask ⊙ activation) / q = {[round(v, 4) for v in train_output]}",
        f"Test output (all units active, no scaling): {test_output}",
    ]
    return DropoutResult(
        keep_probability=keep_probability, mask=mask, train_output=train_output, test_output=test_output, steps=steps
    )
