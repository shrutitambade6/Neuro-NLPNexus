from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.chatbot import ChatRequest, ChatResponse
from app.services.chatbot_service import run_chat

router = APIRouter()


@router.post("/applications/chatbot", response_model=ChatResponse)
def chatbot(payload: ChatRequest, user: User = Depends(require_user)) -> ChatResponse:
    return run_chat(payload.message)
