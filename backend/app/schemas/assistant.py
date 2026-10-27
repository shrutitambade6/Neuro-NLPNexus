from typing import Any

from pydantic import BaseModel, Field


class AssistantRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    context: dict[str, Any] | None = None


class RelatedLab(BaseModel):
    name: str
    route: str


class AssistantResponse(BaseModel):
    message: str
    intent: str
    topic: str | None
    topicName: str | None
    blocks: list[dict[str, Any]]
    relatedLab: RelatedLab | None
    suggestedActions: list[str]
    suggestedQuestions: list[str]
    context: dict[str, Any]
    methodNote: str
