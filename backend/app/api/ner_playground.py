from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.models.orm_models import User
from app.schemas.ner_playground import NerPlaygroundRunRequest, NerPlaygroundRunResponse
from app.services.ner_playground_service import run_playground

router = APIRouter()


@router.post("/applications/ner-playground/run", response_model=NerPlaygroundRunResponse)
def ner_playground_run(
    payload: NerPlaygroundRunRequest,
    _user: User = Depends(require_user),
) -> NerPlaygroundRunResponse:
    # Pydantic has already rejected anything outside the length limits
    # (schemas/ner_playground.py's MAX_CODE_CHARS/MAX_TEXT_CHARS) with a
    # normal 422 before this function ever runs. Execution itself never
    # raises here -- run_playground() always returns a structured
    # NerPlaygroundRunResponse (status="error"/"timeout"/"memory_exceeded"
    # on failure), so there's no try/except needed at this layer.
    return run_playground(payload)
