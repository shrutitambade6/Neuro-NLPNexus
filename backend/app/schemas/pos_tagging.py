from pydantic import BaseModel, Field


class POSTagRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=200, description="Sentence to tag")


class TokenEmission(BaseModel):
    token: str
    is_known: bool
    probabilities: dict[str, float]  # tag -> P(word | tag), aligned to tag_set


class TrellisCellOut(BaseModel):
    tag: str
    log_score: float
    backpointer: str | None


class TrellisStepOut(BaseModel):
    token: str
    is_known: bool
    cells: list[TrellisCellOut]


class TaggedToken(BaseModel):
    token: str
    tag: str


class POSTaggingResponse(BaseModel):
    tokens: list[str]
    tag_set: list[str]
    tag_descriptions: dict[str, str]
    initial_probabilities: dict[str, float]
    transition_matrix: list[list[float]]  # tag_set x tag_set, row = from-tag
    token_emissions: list[TokenEmission]
    trellis: list[TrellisStepOut]
    best_path: list[str]
    best_path_score: float
    tagged: list[TaggedToken]
    unknown_tokens: list[str]
    corpus_size: int
