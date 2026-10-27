from pydantic import BaseModel, Field


class DocumentAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)


class DocEntity(BaseModel):
    text: str
    start: int
    end: int
    label: str


class Keyword(BaseModel):
    word: str
    count: int


class SentimentBrief(BaseModel):
    label: str
    confidence: float


class PipelineStep(BaseModel):
    stage: str
    detail: str


class DocumentAnalysisResponse(BaseModel):
    text: str
    sentence_count: int
    word_count: int
    keywords: list[Keyword]
    entities: list[DocEntity]
    entities_by_label: dict[str, list[str]]
    sentiment: SentimentBrief
    summary: str
    compression_ratio: float
    pipeline: list[PipelineStep]
