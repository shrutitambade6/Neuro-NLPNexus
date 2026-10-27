from pydantic import BaseModel, Field


class NgramTableRequest(BaseModel):
    corpus: list[str] = Field(..., min_length=1, max_length=50)
    n: int = Field(..., ge=1, le=3)


class NgramRow(BaseModel):
    ngram: str
    context: str | None
    count: int
    context_count: int
    probability_unsmoothed: float
    probability_laplace: float


class NgramTableResponse(BaseModel):
    n: int
    vocab_size: int
    total_tokens: int
    total_ngrams: int
    distinct_ngrams: int
    rows: list[NgramRow]
    truncated: bool


class SentenceProbabilityRequest(BaseModel):
    corpus: list[str] = Field(..., min_length=1, max_length=50)
    sentence: str = Field(..., min_length=1, max_length=300)
    n: int = Field(..., ge=1, le=3)
    smoothing: str = Field("none", pattern="^(none|laplace)$")


class ProbabilityStep(BaseModel):
    ngram: str
    context: str
    target: str
    count_ngram: int
    context_count: int
    probability: float
    out_of_vocabulary: bool


class SentenceProbabilityResponse(BaseModel):
    sentence: str
    n: int
    smoothing: str
    tokens: list[str]
    steps: list[ProbabilityStep]
    log_probability: float | None
    total_probability: float
    zero_probability: bool
    perplexity: float | None


class PerplexityRequest(BaseModel):
    probability: float = Field(..., gt=0, le=1)
    n_words: int = Field(..., gt=0)


class PerplexityResponse(BaseModel):
    probability: float
    n_words: int
    perplexity: float
