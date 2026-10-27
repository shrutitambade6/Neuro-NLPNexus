from fastapi import APIRouter, Depends
from app.api.deps import require_user
from app.models.orm_models import User

from app.schemas.document_analysis import DocumentAnalysisRequest, DocumentAnalysisResponse
from app.services.document_analysis_service import run_document_analysis

router = APIRouter()


@router.post("/applications/document-analysis", response_model=DocumentAnalysisResponse)
def document_analysis(payload: DocumentAnalysisRequest, user: User = Depends(require_user)) -> DocumentAnalysisResponse:
    return run_document_analysis(payload.text)
