"""
Concept DNA API. One endpoint, deliberately — the hero summary, the
graph (concepts + edges), the weak-concept radar, the recommendation, and
the cross-domain highlights are all derived from the SAME computation
(app/services/concept_dna_service.get_concept_dna) over the SAME signals,
so splitting them into /concepts, /progress, /recommendations would just
mean recomputing (or caching) the same thing three times for one page
load. Every field returned is already the signed-in student's own data
(require_user), and nothing here exposes another student's rows, a raw
QuizResult/ChallengeAttempt table, or any API/DB diagnostics.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.database import get_db
from app.models.orm_models import User
from app.schemas.concept_dna import ConceptDnaResponse
from app.services.concept_dna_service import get_concept_dna

router = APIRouter()


@router.get("/concept-dna", response_model=ConceptDnaResponse)
def concept_dna_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> ConceptDnaResponse:
    return get_concept_dna(db, user)
