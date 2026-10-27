from pydantic import BaseModel, Field


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class MatchedWord(BaseModel):
    word: str
    base_polarity: float
    negated: bool
    multiplier: float
    contribution: float


class PipelineStep(BaseModel):
    stage: str
    detail: str


class SentimentResponse(BaseModel):
    text: str
    label: str
    score: float
    confidence: float
    matched_words: list[MatchedWord]
    pipeline: list[PipelineStep]
