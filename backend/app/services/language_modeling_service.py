from app.algorithms.language_modeling import (
    ngram_table,
    perplexity_from_probability,
    sentence_probability,
)
from app.schemas.language_modeling import (
    NgramTableResponse,
    PerplexityResponse,
    SentenceProbabilityResponse,
)


def run_ngram_table(corpus: list[str], n: int) -> NgramTableResponse:
    return NgramTableResponse(**ngram_table(corpus, n))


def run_sentence_probability(
    corpus: list[str], sentence: str, n: int, smoothing: str
) -> SentenceProbabilityResponse:
    return SentenceProbabilityResponse(**sentence_probability(corpus, sentence, n, smoothing))


def run_perplexity(probability: float, n_words: int) -> PerplexityResponse:
    return PerplexityResponse(
        probability=probability,
        n_words=n_words,
        perplexity=perplexity_from_probability(probability, n_words),
    )
