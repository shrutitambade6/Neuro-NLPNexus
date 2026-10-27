from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.language_modeling import (
    NgramTableRequest,
    NgramTableResponse,
    PerplexityRequest,
    PerplexityResponse,
    SentenceProbabilityRequest,
    SentenceProbabilityResponse,
)
from app.services.language_modeling_service import (
    run_ngram_table,
    run_perplexity,
    run_sentence_probability,
)

router = APIRouter()


@router.post("/lm/ngrams", response_model=NgramTableResponse)
def ngrams(payload: NgramTableRequest, user: User = Depends(require_user)) -> NgramTableResponse:
    return run_ngram_table(payload.corpus, payload.n)


@router.post("/lm/sentence-probability", response_model=SentenceProbabilityResponse)
def sentence_probability_endpoint(payload: SentenceProbabilityRequest, user: User = Depends(require_user)) -> SentenceProbabilityResponse:
    return run_sentence_probability(payload.corpus, payload.sentence, payload.n, payload.smoothing)


@router.post("/lm/perplexity", response_model=PerplexityResponse)
def perplexity(payload: PerplexityRequest, user: User = Depends(require_user)) -> PerplexityResponse:
    return run_perplexity(payload.probability, payload.n_words)
