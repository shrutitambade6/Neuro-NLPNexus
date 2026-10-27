from pydantic import BaseModel, Field


class RandomProjectionRequest(BaseModel):
    dim: int = Field(..., ge=2, le=4)
    d_k: int = Field(..., ge=1, le=4)
    d_v: int = Field(..., ge=1, le=4)
    seed: int | None = None


class ProjectionWeightsIO(BaseModel):
    w_q: list[list[float]]
    w_k: list[list[float]]
    w_v: list[list[float]]


class AttentionForwardRequest(BaseModel):
    embeddings: list[list[float]] = Field(..., min_length=2, max_length=6)
    weights: ProjectionWeightsIO


class AttentionForwardResponse(BaseModel):
    queries: list[list[float]]
    keys: list[list[float]]
    values: list[list[float]]
    raw_scores: list[list[float]]
    scaled_scores: list[list[float]]
    attention_weights: list[list[float]]
    output: list[list[float]]
