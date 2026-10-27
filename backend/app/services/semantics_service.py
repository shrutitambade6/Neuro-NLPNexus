from app.algorithms.semantics import (
    compute_tfidf,
    cosine_similarity,
    jaccard_similarity,
    lesk_wsd,
)
from app.schemas.semantics import (
    CosineResponse,
    JaccardResponse,
    TfidfResponse,
    WsdResponse,
)


def run_jaccard(set_a: list[str], set_b: list[str]) -> JaccardResponse:
    return JaccardResponse(**jaccard_similarity(set_a, set_b))


def run_cosine(vector_a: list[float], vector_b: list[float]) -> CosineResponse:
    return CosineResponse(**cosine_similarity(vector_a, vector_b))


def run_tfidf(documents: list[str]) -> TfidfResponse:
    return TfidfResponse(**compute_tfidf(documents))


def run_wsd(sentence: str, target_word: str) -> WsdResponse:
    return WsdResponse(**lesk_wsd(sentence, target_word))
