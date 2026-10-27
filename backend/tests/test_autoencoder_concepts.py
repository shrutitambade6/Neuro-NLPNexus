"""
Tests app.algorithms.autoencoder_concepts against the formulas in the
user's uploaded Autoencoders_1.docx (Module 3). This document has fewer
single "textbook worked examples" with plug-in numbers than chap_01 or
nn_chap2, so these tests verify mathematical correctness and
self-consistency of each formula (matching the doc's own equations)
rather than reproducing one canonical numeric answer.
"""
import math

import pytest

from app.algorithms.autoencoder_concepts import (
    AutoencoderConceptsError,
    inverted_dropout,
    l2_penalty,
    linear_autoencoder,
    reconstruction_loss,
    sparsity_kl_divergence,
)


# --- linear_autoencoder (sections 2-6, 9: linear AE ~ PCA) ----------------


def test_linear_autoencoder_computes_real_forward_pass():
    # input dim 2 -> latent dim 1 (compression) -> reconstruction dim 2
    result = linear_autoencoder([3.0, 1.0], encoder_weights=[[0.5, 0.5]], decoder_weights=[[1.0], [1.0]])
    assert result.latent == pytest.approx([2.0])
    assert result.reconstruction == pytest.approx([2.0, 2.0])
    assert result.mse == pytest.approx(1.0)  # ((3-2)^2 + (1-2)^2) / 2


def test_linear_autoencoder_perfect_reconstruction_has_zero_mse():
    # Identity encoder/decoder: latent dim == input dim, weights = identity
    result = linear_autoencoder([4.0, -2.0], encoder_weights=[[1.0, 0.0], [0.0, 1.0]], decoder_weights=[[1.0, 0.0], [0.0, 1.0]])
    assert result.reconstruction == pytest.approx([4.0, -2.0])
    assert result.mse == pytest.approx(0.0, abs=1e-9)


def test_linear_autoencoder_rejects_mismatched_encoder_shape():
    with pytest.raises(AutoencoderConceptsError):
        linear_autoencoder([1.0, 2.0], encoder_weights=[[1.0, 1.0, 1.0]], decoder_weights=[[1.0], [1.0]])


def test_linear_autoencoder_rejects_mismatched_decoder_shape():
    with pytest.raises(AutoencoderConceptsError):
        linear_autoencoder([1.0, 2.0], encoder_weights=[[1.0, 1.0]], decoder_weights=[[1.0, 1.0]])


# --- reconstruction_loss (section 6: MSE / BCE) ---------------------------


def test_reconstruction_loss_mse_matches_hand_calculation():
    result = reconstruction_loss([0.2, 0.8], [0.3, 0.7])
    assert result.mse == pytest.approx(0.01)


def test_reconstruction_loss_bce_computed_when_values_in_unit_interval():
    result = reconstruction_loss([0.2, 0.8], [0.3, 0.7])
    assert result.binary_cross_entropy == pytest.approx(0.5261, abs=0.001)


def test_reconstruction_loss_bce_is_none_outside_unit_interval():
    result = reconstruction_loss([2.0, 5.0], [2.1, 4.9])
    assert result.binary_cross_entropy is None
    assert result.mse == pytest.approx(0.01)


def test_reconstruction_loss_perfect_match_is_zero():
    # MSE is zero for any perfect match; BCE is zero only when the
    # reconstructed probabilities are themselves confidently correct
    # (0 or 1) — matching a value like 0.5 exactly still costs entropy,
    # so this uses confident targets to check the true zero case.
    result = reconstruction_loss([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    assert result.mse == pytest.approx(0.0)
    assert result.binary_cross_entropy == pytest.approx(-math.log(0.5))

    confident = reconstruction_loss([0.0, 1.0], [0.0, 1.0])
    assert confident.mse == pytest.approx(0.0)
    assert confident.binary_cross_entropy == pytest.approx(0.0, abs=1e-6)


def test_reconstruction_loss_rejects_length_mismatch():
    with pytest.raises(AutoencoderConceptsError):
        reconstruction_loss([1.0, 2.0], [1.0])


# --- sparsity_kl_divergence (section 11.3: sparse autoencoder penalty) ---


def test_sparsity_kl_divergence_matches_hand_calculation():
    # rho = 0.05 (a common sparse-AE target), rho_hat = 0.1 (neuron fires twice as often as desired)
    result = sparsity_kl_divergence(0.05, 0.1)
    expected = 0.05 * math.log(0.05 / 0.1) + 0.95 * math.log(0.95 / 0.9)
    assert result.kl_divergence == pytest.approx(expected)
    assert result.kl_divergence > 0  # KL divergence is always non-negative except when equal


def test_sparsity_kl_divergence_is_zero_when_actual_matches_target():
    result = sparsity_kl_divergence(0.1, 0.1)
    assert result.kl_divergence == pytest.approx(0.0, abs=1e-9)


def test_sparsity_kl_divergence_grows_with_distance_from_target():
    close = sparsity_kl_divergence(0.05, 0.06)
    far = sparsity_kl_divergence(0.05, 0.5)
    assert far.kl_divergence > close.kl_divergence


def test_sparsity_kl_divergence_rejects_boundary_values():
    with pytest.raises(AutoencoderConceptsError):
        sparsity_kl_divergence(0.0, 0.1)
    with pytest.raises(AutoencoderConceptsError):
        sparsity_kl_divergence(0.1, 1.0)


# --- l2_penalty (section 14: L2 regularization) ---------------------------


def test_l2_penalty_matches_doc_hand_calculation():
    # Autoencoders_1.docx §14 uses L_total = L_data + (lambda/2)*sum(w_i^2),
    # so the regularizer's gradient contribution is lambda*w_i (NOT the more
    # common 2*lambda*w_i convention) — verified against the doc's own
    # formulas in §14.1 and §14.3, not a generic textbook L2 calculator.
    result = l2_penalty([0.5, -0.3], lambda_=0.1, learning_rate=0.1)
    assert result.regularization_term == pytest.approx(0.34)  # R(W) = 0.5^2 + (-0.3)^2
    assert result.penalty == pytest.approx(0.017)  # (0.1/2) * 0.34
    assert result.gradient_contribution == pytest.approx([0.05, -0.03])  # lambda * w_i
    assert result.updated_weights == pytest.approx([0.495, -0.297])  # w - 0.1*(lambda*w)


def test_l2_penalty_shrinks_weights_toward_zero():
    result = l2_penalty([2.0, -2.0], lambda_=0.5, learning_rate=0.1)
    assert abs(result.updated_weights[0]) < abs(2.0)
    assert abs(result.updated_weights[1]) < abs(-2.0)


def test_l2_penalty_zero_lambda_means_no_penalty_or_shrinkage():
    result = l2_penalty([1.0, 2.0], lambda_=0.0, learning_rate=0.1)
    assert result.penalty == pytest.approx(0.0)
    assert result.updated_weights == pytest.approx([1.0, 2.0])


def test_l2_penalty_rejects_negative_lambda():
    with pytest.raises(AutoencoderConceptsError):
        l2_penalty([1.0], lambda_=-0.1, learning_rate=0.1)


# --- inverted_dropout (section 20.3/20.4) ---------------------------------


def test_inverted_dropout_is_genuinely_random_across_calls():
    masks = {tuple(inverted_dropout([1.0] * 20, 0.5).mask) for _ in range(10)}
    # With 20 real coin flips per call, getting the identical mask 10 times running is
    # astronomically unlikely if this is truly random and not a hardcoded/fake mask.
    assert len(masks) > 1


def test_inverted_dropout_same_seed_is_reproducible():
    r1 = inverted_dropout([1.0, 2.0, 3.0, 4.0, 5.0], 0.5, seed=42)
    r2 = inverted_dropout([1.0, 2.0, 3.0, 4.0, 5.0], 0.5, seed=42)
    assert r1.mask == r2.mask
    assert r1.train_output == pytest.approx(r2.train_output)


def test_inverted_dropout_scaling_is_correct():
    result = inverted_dropout([2.0, 2.0, 2.0, 2.0], 0.5, seed=7)
    keep_prob = result.keep_probability
    assert keep_prob == pytest.approx(0.5)
    for kept, activation, output in zip(result.mask, [2.0, 2.0, 2.0, 2.0], result.train_output):
        if kept:
            assert output == pytest.approx(activation / keep_prob)
        else:
            assert output == 0.0


def test_inverted_dropout_test_time_output_is_unscaled_and_all_active():
    result = inverted_dropout([1.0, 2.0, 3.0], 0.3, seed=1)
    assert result.test_output == [1.0, 2.0, 3.0]


def test_inverted_dropout_zero_probability_keeps_everything():
    result = inverted_dropout([1.0, 2.0, 3.0], 0.0, seed=1)
    assert result.mask == [1, 1, 1]
    assert result.train_output == pytest.approx([1.0, 2.0, 3.0])


def test_inverted_dropout_rejects_invalid_probability():
    with pytest.raises(AutoencoderConceptsError):
        inverted_dropout([1.0], drop_probability=1.0)
    with pytest.raises(AutoencoderConceptsError):
        inverted_dropout([1.0], drop_probability=-0.1)
