from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.discourse import ResolvePronounRequest, ResolvePronounResponse
from app.services.discourse_service import run_resolve_pronoun

router = APIRouter()


@router.post("/discourse/resolve-pronoun", response_model=ResolvePronounResponse)
def resolve_pronoun_endpoint(payload: ResolvePronounRequest, user: User = Depends(require_user)) -> ResolvePronounResponse:
    return run_resolve_pronoun(payload.sentence, payload.pronoun)
