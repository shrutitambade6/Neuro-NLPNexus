from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.information_retrieval import SearchRequest, SearchResponse
from app.services.information_retrieval_service import run_search

router = APIRouter()


@router.post("/applications/search", response_model=SearchResponse)
def search(payload: SearchRequest, user: User = Depends(require_user)) -> SearchResponse:
    return run_search(payload.query, payload.top_k)
