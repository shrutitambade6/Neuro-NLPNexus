from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


class ChatResponse(BaseModel):
    message: str
    matched_topic: str | None
    answer: str
    known_topics: list[str]
    method_note: str
