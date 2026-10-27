from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.summarization import SummarizeRequest, SummarizeResponse
from app.services.summarization_service import run_summarize

router = APIRouter()


@router.post("/applications/summarize", response_model=SummarizeResponse)
def summarize(payload: SummarizeRequest, user: User = Depends(require_user)) -> SummarizeResponse:
    return run_summarize(payload.text, payload.n_sentences)
