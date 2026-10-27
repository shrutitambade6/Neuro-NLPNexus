from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.pos_tagging import POSTagRequest, POSTaggingResponse
from app.services.pos_tagging_service import tag_sentence

router = APIRouter()


@router.post("/pos-tagging/tag", response_model=POSTaggingResponse)
def pos_tag(payload: POSTagRequest, user: User = Depends(require_user)) -> POSTaggingResponse:
    """Tags a real sentence with the from-scratch HMM + Viterbi tagger,
    returning every matrix and trellis value needed to animate the full
    Tokens -> Transition/Emission matrices -> Viterbi trellis -> tagged
    sentence pipeline on the frontend."""
    return tag_sentence(payload.sentence)
