from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.attention import AttentionError
from app.schemas.attention import (
    AttentionForwardRequest,
    AttentionForwardResponse,
    ProjectionWeightsIO,
    RandomProjectionRequest,
)
from app.services.attention_service import run_attention_forward, run_random_projection

router = APIRouter()


@router.post("/dl/attention/random-projection", response_model=ProjectionWeightsIO)
def random_projection_endpoint(payload: RandomProjectionRequest, user: User = Depends(require_user)) -> ProjectionWeightsIO:
    try:
        return run_random_projection(payload.dim, payload.d_k, payload.d_v, payload.seed)
    except AttentionError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e


@router.post("/dl/attention/forward", response_model=AttentionForwardResponse)
def attention_forward_endpoint(payload: AttentionForwardRequest, user: User = Depends(require_user)) -> AttentionForwardResponse:
    try:
        return run_attention_forward(payload.embeddings, payload.weights)
    except AttentionError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
