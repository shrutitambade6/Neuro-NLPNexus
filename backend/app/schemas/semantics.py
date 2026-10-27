from pydantic import BaseModel, Field


class JaccardRequest(BaseModel):
    set_a: list[str] = Field(..., min_length=1, max_length=50)
    set_b: list[str] = Field(..., min_length=1, max_length=50)


class JaccardResponse(BaseModel):
    set_a: list[str]
    set_b: list[str]
    intersection: list[str]
    union: list[str]
    intersection_size: int
    union_size: int
    jaccard: float


class CosineRequest(BaseModel):
    vector_a: list[float] = Field(..., min_length=1, max_length=50)
    vector_b: list[float] = Field(..., min_length=1, max_length=50)


class CosineResponse(BaseModel):
    vector_a: list[float]
    vector_b: list[float]
    dot_product: float
    magnitude_a: float
    magnitude_b: float
    cosine_similarity: float


class TfidfRequest(BaseModel):
    documents: list[str] = Field(..., min_length=1, max_length=10)


class TfidfDocScore(BaseModel):
    doc_index: int
    tf: float
    tfidf: float


class TfidfRow(BaseModel):
    term: str
    df: int
    idf: float
    per_doc: list[TfidfDocScore]


class TfidfResponse(BaseModel):
    documents: list[str]
    vocabulary: list[str]
    matrix: list[TfidfRow]


class WsdRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=500)
    target_word: str = Field(..., min_length=1, max_length=50)


class WsdCandidate(BaseModel):
    sense_id: str
    gloss: str
    overlap_words: list[str]
    overlap_count: int


class WsdResponse(BaseModel):
    target_word: str
    available: bool
    message: str | None
    context_words: list[str] = []
    candidates: list[WsdCandidate]
    predicted_sense: str | None
    tie: bool = False
