from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.pipeline import (
    PipelineCompareRequest,
    PipelineCompareResponse,
    PipelineRunRequest,
    PipelineRunResponse,
)
from app.services.pipeline_service import compare_pipelines_service, run_pipeline_service

router = APIRouter()


@router.post("/playground/run", response_model=PipelineRunResponse)
def run(payload: PipelineRunRequest, user: User = Depends(require_user)) -> PipelineRunResponse:
    try:
        return run_pipeline_service(payload.text, payload.tokenizer, payload.stages)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/playground/compare", response_model=PipelineCompareResponse)
def compare(payload: PipelineCompareRequest, user: User = Depends(require_user)) -> PipelineCompareResponse:
    try:
        return compare_pipelines_service(payload.text_a, payload.text_b, payload.tokenizer, payload.stages)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
