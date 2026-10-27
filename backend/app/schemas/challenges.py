from typing import Any

from pydantic import BaseModel


class ChallengeOut(BaseModel):
    id: int
    module: str
    difficulty: str
    prompt: dict[str, Any]
    xp_value: int

    model_config = {"from_attributes": True}


class AttemptRequest(BaseModel):
    submitted_answer: Any


class AttemptResponse(BaseModel):
    correct: bool
    correct_answer: Any
    xp_awarded: int
    score: int


class MyProgressResponse(BaseModel):
    attempted: int
    solved: int
    total_xp: int
    total_challenges: int
