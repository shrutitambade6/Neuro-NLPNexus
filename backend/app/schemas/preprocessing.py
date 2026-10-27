from pydantic import BaseModel, Field


class TokenizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000, description="Text to tokenize")


class TokenizeComparison(BaseModel):
    whitespace: list[str]
    rule_based: list[str]
    regex: list[str]
    sentences: list[str]


class TokenizeResponse(BaseModel):
    input_text: str
    tokens: TokenizeComparison
    token_counts: dict[str, int]
