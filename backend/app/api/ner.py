from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import require_user
from app.models.orm_models import User

from app.algorithms.ner_spacy import SpacyUnavailableError
from app.schemas.ner import NerRequest, NerResponse
from app.services.ner_service import run_ner

router = APIRouter()


@router.post("/applications/ner", response_model=NerResponse)
def ner(payload: NerRequest, user: User = Depends(require_user)) -> NerResponse:
    try:
        return run_ner(payload.text, payload.engine)
    except SpacyUnavailableError as e:
        # The spaCy engine specifically isn't installed/downloaded in
        # this deployment -- a real "this feature isn't available here"
        # condition, not a bad request, so 503 rather than 422.
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
