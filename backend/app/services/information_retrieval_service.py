from app.algorithms.information_retrieval import search
from app.schemas.information_retrieval import SearchResponse


def run_search(query: str, top_k: int) -> SearchResponse:
    return SearchResponse(**search(query, top_k))
