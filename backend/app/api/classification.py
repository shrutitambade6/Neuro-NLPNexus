from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.classification import ClassifyRequest, ClassifyResponse
from app.services.classification_service import run_classify

router = APIRouter()


@router.post("/applications/classify", response_model=ClassifyResponse)
def classify(payload: ClassifyRequest, user: User = Depends(require_user)) -> ClassifyResponse:
    return run_classify(payload.text)
