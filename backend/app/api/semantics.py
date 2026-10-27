from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.semantics import (
    CosineRequest,
    CosineResponse,
    JaccardRequest,
    JaccardResponse,
    TfidfRequest,
    TfidfResponse,
    WsdRequest,
    WsdResponse,
)
from app.services.semantics_service import run_cosine, run_jaccard, run_tfidf, run_wsd

router = APIRouter()


@router.post("/semantics/jaccard", response_model=JaccardResponse)
def jaccard(payload: JaccardRequest, user: User = Depends(require_user)) -> JaccardResponse:
    return run_jaccard(payload.set_a, payload.set_b)


@router.post("/semantics/cosine", response_model=CosineResponse)
def cosine(payload: CosineRequest, user: User = Depends(require_user)) -> CosineResponse:
    if len(payload.vector_a) != len(payload.vector_b):
        raise HTTPException(status_code=422, detail="Vectors must be the same length.")
    return run_cosine(payload.vector_a, payload.vector_b)


@router.post("/semantics/tfidf", response_model=TfidfResponse)
def tfidf(payload: TfidfRequest, user: User = Depends(require_user)) -> TfidfResponse:
    return run_tfidf(payload.documents)


@router.post("/semantics/wsd", response_model=WsdResponse)
def wsd(payload: WsdRequest, user: User = Depends(require_user)) -> WsdResponse:
    return run_wsd(payload.sentence, payload.target_word)
