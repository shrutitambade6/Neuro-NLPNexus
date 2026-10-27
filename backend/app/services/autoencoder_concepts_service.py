from app.algorithms import autoencoder_concepts as algo
from app.schemas.autoencoder_concepts import (
    DropoutRequest,
    DropoutResponse,
    L2PenaltyRequest,
    L2PenaltyResponse,
    LinearAutoencoderRequest,
    LinearAutoencoderResponse,
    ReconstructionLossRequest,
    ReconstructionLossResponse,
    SparsityPenaltyRequest,
    SparsityPenaltyResponse,
)


def run_linear_autoencoder(payload: LinearAutoencoderRequest) -> LinearAutoencoderResponse:
    result = algo.linear_autoencoder(payload.input_vector, payload.encoder_weights, payload.decoder_weights)
    return LinearAutoencoderResponse(
        latent=result.latent, reconstruction=result.reconstruction, mse=result.mse, steps=result.steps
    )


def run_reconstruction_loss(payload: ReconstructionLossRequest) -> ReconstructionLossResponse:
    result = algo.reconstruction_loss(payload.original, payload.reconstructed)
    return ReconstructionLossResponse(mse=result.mse, binary_cross_entropy=result.binary_cross_entropy, steps=result.steps)


def run_sparsity_penalty(payload: SparsityPenaltyRequest) -> SparsityPenaltyResponse:
    result = algo.sparsity_kl_divergence(payload.rho, payload.rho_hat)
    return SparsityPenaltyResponse(kl_divergence=result.kl_divergence, steps=result.steps)


def run_l2_penalty(payload: L2PenaltyRequest) -> L2PenaltyResponse:
    result = algo.l2_penalty(payload.weights, payload.lambda_, payload.learning_rate)
    return L2PenaltyResponse(
        regularization_term=result.regularization_term,
        penalty=result.penalty,
        gradient_contribution=result.gradient_contribution,
        updated_weights=result.updated_weights,
        steps=result.steps,
    )


def run_dropout(payload: DropoutRequest) -> DropoutResponse:
    result = algo.inverted_dropout(payload.activations, payload.drop_probability, payload.seed)
    return DropoutResponse(
        keep_probability=result.keep_probability,
        mask=result.mask,
        train_output=result.train_output,
        test_output=result.test_output,
        steps=result.steps,
    )
