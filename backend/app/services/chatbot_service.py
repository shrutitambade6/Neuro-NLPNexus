from app.algorithms.chatbot import ask
from app.schemas.chatbot import ChatResponse


def run_chat(message: str) -> ChatResponse:
    return ChatResponse(**ask(message))
