from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.preprocessing import TokenizeRequest, TokenizeResponse
from app.services.preprocessing_service import compare_tokenizers

router = APIRouter()


@router.post("/tokenize", response_model=TokenizeResponse)
def tokenize(payload: TokenizeRequest, user: User = Depends(require_user)) -> TokenizeResponse:
    """Runs whitespace, rule-based, regex, and sentence tokenization on the
    same input so the frontend can render a side-by-side comparison."""
    return compare_tokenizers(payload.text)
