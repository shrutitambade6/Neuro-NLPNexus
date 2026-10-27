from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.question_answering import QaRequest, QaResponse
from app.services.question_answering_service import run_qa

router = APIRouter()


@router.post("/applications/qa", response_model=QaResponse)
def qa(payload: QaRequest, user: User = Depends(require_user)) -> QaResponse:
    return run_qa(payload.context, payload.question)
