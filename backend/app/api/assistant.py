from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.assistant import AssistantRequest, AssistantResponse
from app.services.assistant_service import run_assistant

router = APIRouter()


@router.post("/applications/assistant", response_model=AssistantResponse)
def assistant(payload: AssistantRequest, user: User = Depends(require_user)) -> AssistantResponse:
    return run_assistant(payload.message, payload.context)
