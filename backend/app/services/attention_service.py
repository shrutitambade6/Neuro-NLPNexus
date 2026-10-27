from app.algorithms.attention import (
    ProjectionWeights,
    random_projection_weights,
    scaled_dot_product_attention,
)
from app.schemas.attention import AttentionForwardResponse, ProjectionWeightsIO


def run_random_projection(dim: int, d_k: int, d_v: int, seed: int | None) -> ProjectionWeightsIO:
    w = random_projection_weights(dim, d_k, d_v, seed)
    return ProjectionWeightsIO(w_q=w.w_q, w_k=w.w_k, w_v=w.w_v)


def run_attention_forward(embeddings, weights: ProjectionWeightsIO) -> AttentionForwardResponse:
    w = ProjectionWeights(w_q=weights.w_q, w_k=weights.w_k, w_v=weights.w_v)
    result = scaled_dot_product_attention(embeddings, w)
    return AttentionForwardResponse(
        queries=result.queries,
        keys=result.keys,
        values=result.values,
        raw_scores=result.raw_scores,
        scaled_scores=result.scaled_scores,
        attention_weights=result.attention_weights,
        output=result.output,
    )
