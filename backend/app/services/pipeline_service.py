from app.algorithms.pipeline import compare_pipelines, run_pipeline
from app.schemas.pipeline import (
    CosineResponse,
    JaccardResponse,
    PipelineCompareResponse,
    PipelineRunResponse,
)


def run_pipeline_service(text: str, tokenizer: str, stages: list[str]) -> PipelineRunResponse:
    return PipelineRunResponse(**run_pipeline(text, tokenizer, stages))


def compare_pipelines_service(
    text_a: str, text_b: str, tokenizer: str, stages: list[str]
) -> PipelineCompareResponse:
    result = compare_pipelines(text_a, text_b, tokenizer, stages)
    return PipelineCompareResponse(
        pipeline_a=PipelineRunResponse(**result["pipeline_a"]),
        pipeline_b=PipelineRunResponse(**result["pipeline_b"]),
        vocab=result["vocab"],
        jaccard=JaccardResponse(**result["jaccard"]),
        cosine=CosineResponse(**result["cosine"]),
    )
