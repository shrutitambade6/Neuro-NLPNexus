from pydantic import BaseModel, Field


class QaRequest(BaseModel):
    context: str = Field(..., min_length=1, max_length=4000)
    question: str = Field(..., min_length=1, max_length=300)


class QaEntity(BaseModel):
    text: str
    start: int
    end: int
    label: str


class QaSentenceScore(BaseModel):
    index: int
    sentence: str
    overlap_words: list[str]
    overlap_count: int


class QaResponse(BaseModel):
    context: str
    question: str
    question_type: str
    answer: str | None
    answer_sentence: str | None
    supporting_entities: list[QaEntity]
    message: str | None
    all_sentence_scores: list[QaSentenceScore] = []
    method_note: str
