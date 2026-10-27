from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)
    n_sentences: int = Field(default=3, ge=1, le=10)


class SentenceScore(BaseModel):
    index: int
    sentence: str
    score: float | None
    selected: bool


class SummarizeResponse(BaseModel):
    original_text: str
    summary: str
    original_sentence_count: int
    summary_sentence_count: int
    original_word_count: int
    summary_word_count: int
    compression_ratio: float
    sentence_scores: list[SentenceScore]
