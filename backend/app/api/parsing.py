from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.parsing import CYKRequest, CYKResponse, TopDownResponse
from app.services.parsing_service import parse_with_cyk, parse_with_top_down

router = APIRouter()


@router.post("/parse/cyk", response_model=CYKResponse)
def cyk_parse(payload: CYKRequest, user: User = Depends(require_user)) -> CYKResponse:
    """Runs the CYK algorithm against the default educational CNF grammar
    and returns the full chart plus a reconstructed parse tree if accepted."""
    return parse_with_cyk(payload.sentence)


@router.post("/parse/top-down", response_model=TopDownResponse)
def top_down_parse_endpoint(payload: CYKRequest, user: User = Depends(require_user)) -> TopDownResponse:
    """Runs a real top-down (leftmost-derivation) parser against the exact
    same default grammar as /parse/cyk, over the same sentence — the
    Parsing Lab's Bottom-Up vs Top-Down comparison calls both endpoints
    with identical input so the two results are a fair, same-grammar
    comparison, not two different toy grammars."""
    return parse_with_top_down(payload.sentence)
