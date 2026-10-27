from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.spam_detection import SpamRequest, SpamResponse
from app.services.spam_detection_service import run_spam_check

router = APIRouter()


@router.post("/applications/spam-check", response_model=SpamResponse)
def spam_check(payload: SpamRequest, user: User = Depends(require_user)) -> SpamResponse:
    return run_spam_check(payload.subject, payload.message, payload.sender)
