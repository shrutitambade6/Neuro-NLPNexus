from typing import Any

from app.algorithms.nlp_assistant import process_message
from app.schemas.assistant import AssistantResponse


def run_assistant(message: str, context: dict[str, Any] | None) -> AssistantResponse:
    return AssistantResponse(**process_message(message, context))
