from pydantic import BaseModel, Field


class MorphologyRequest(BaseModel):
    words: list[str] = Field(..., min_length=1, max_length=50)


class WordMorphology(BaseModel):
    word: str
    stem: str
    lemma: str
    lemma_method: str  # "irregular" | "regular-rule" | "unchanged"
    prefix: str | None
    root: str
    suffix: str | None


class MorphologyResponse(BaseModel):
    results: list[WordMorphology]
