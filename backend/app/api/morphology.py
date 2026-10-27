from fastapi import APIRouter, HTTPException, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.morphology import MorphologyRequest, MorphologyResponse
from app.services.morphology_service import run_morphology

router = APIRouter()


@router.post("/morphology/analyze", response_model=MorphologyResponse)
def analyze_morphology(payload: MorphologyRequest, user: User = Depends(require_user)) -> MorphologyResponse:
    cleaned = [w for w in payload.words if w.strip()]
    if not cleaned:
        raise HTTPException(status_code=422, detail="Provide at least one non-empty word.")
    return run_morphology(cleaned)
