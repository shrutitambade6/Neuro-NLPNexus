from pydantic import BaseModel, Field

from app.schemas.semantics import CosineResponse, JaccardResponse


class PipelineRunRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5_000)
    tokenizer: str = Field("whitespace")
    stages: list[str] = Field(default_factory=list, max_length=10)


class PipelineStageTrace(BaseModel):
    stage: str
    tokens: list[str]


class PipelineRunResponse(BaseModel):
    input_text: str
    tokenizer: str
    stages: list[str]
    trace: list[PipelineStageTrace]
    final_tokens: list[str]


class PipelineCompareRequest(BaseModel):
    text_a: str = Field(..., min_length=1, max_length=5_000)
    text_b: str = Field(..., min_length=1, max_length=5_000)
    tokenizer: str = Field("whitespace")
    stages: list[str] = Field(default_factory=list, max_length=10)


class PipelineCompareResponse(BaseModel):
    pipeline_a: PipelineRunResponse
    pipeline_b: PipelineRunResponse
    vocab: list[str]
    jaccard: JaccardResponse
    cosine: CosineResponse
