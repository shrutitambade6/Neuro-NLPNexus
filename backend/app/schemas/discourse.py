from pydantic import BaseModel, Field


class ResolvePronounRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=300)
    pronoun: str = Field(..., min_length=1, max_length=10)


class Candidate(BaseModel):
    text: str
    is_proper_noun: bool
    is_person: bool
    word_distance: int
    gender: str
    number: str
    agrees_with_pronoun: bool
    reason: str


class ResolvePronounResponse(BaseModel):
    sentence: str
    pronoun: str
    available: bool
    message: str | None
    candidates: list[Candidate]
    resolved_antecedent: str | None
