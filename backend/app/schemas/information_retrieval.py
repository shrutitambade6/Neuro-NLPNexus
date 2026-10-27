from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    top_k: int = Field(default=5, ge=1, le=10)


class SearchResult(BaseModel):
    doc_id: str
    title: str
    snippet: str
    relevance: float
    matched_terms: list[str]


class SearchResponse(BaseModel):
    query: str
    method: str
    corpus_size: int
    results: list[SearchResult]
