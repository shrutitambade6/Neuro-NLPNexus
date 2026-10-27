from app.algorithms.document_analysis import analyze_document
from app.schemas.document_analysis import DocumentAnalysisResponse


def run_document_analysis(text: str) -> DocumentAnalysisResponse:
    return DocumentAnalysisResponse(**analyze_document(text))
