from pydantic import BaseModel, ConfigDict, Field


# --- Linear autoencoder (encoder/decoder + reconstruction) ---------------


class LinearAutoencoderRequest(BaseModel):
    input_vector: list[float] = Field(..., min_length=1)
    encoder_weights: list[list[float]] = Field(..., min_length=1)
    decoder_weights: list[list[float]] = Field(..., min_length=1)


class LinearAutoencoderResponse(BaseModel):
    latent: list[float]
    reconstruction: list[float]
    mse: float
    steps: list[str]


class ReconstructionLossRequest(BaseModel):
    original: list[float] = Field(..., min_length=1)
    reconstructed: list[float] = Field(..., min_length=1)


class ReconstructionLossResponse(BaseModel):
    mse: float
    binary_cross_entropy: float | None
    steps: list[str]


# --- Sparse autoencoder KL-divergence sparsity penalty --------------------


class SparsityPenaltyRequest(BaseModel):
    rho: float = Field(..., gt=0, lt=1, description="Desired (target) average activation.")
    rho_hat: float = Field(..., gt=0, lt=1, description="Actual average activation observed.")


class SparsityPenaltyResponse(BaseModel):
    kl_divergence: float
    steps: list[str]


# --- L2 regularization ----------------------------------------------------


class L2PenaltyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    weights: list[float] = Field(..., min_length=1)
    lambda_: float = Field(..., ge=0, alias="lambda")
    learning_rate: float = Field(default=0.1, gt=0)


class L2PenaltyResponse(BaseModel):
    regularization_term: float
    penalty: float
    gradient_contribution: list[float]
    updated_weights: list[float]
    steps: list[str]


# --- Inverted dropout -------------------------------------------------------


class DropoutRequest(BaseModel):
    activations: list[float] = Field(..., min_length=1)
    drop_probability: float = Field(..., ge=0, lt=1)
    seed: int | None = Field(default=None, description="Optional, for a reproducible demo run only.")


class DropoutResponse(BaseModel):
    keep_probability: float
    mask: list[int]
    train_output: list[float]
    test_output: list[float]
    steps: list[str]
