from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.database import get_db
from app.models.orm_models import User
from app.schemas.progress import (
    MySummaryResponse,
    ProgressEntryOut,
    QuizResultOut,
    RecordProgressRequest,
    RecordQuizResultRequest,
)
from app.services.progress_service import get_my_summary, record_progress, record_quiz_result

router = APIRouter()


@router.post("/progress/complete", response_model=ProgressEntryOut)
def record_progress_endpoint(
    payload: RecordProgressRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> ProgressEntryOut:
    try:
        return record_progress(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/progress/quiz-result", response_model=QuizResultOut)
def record_quiz_result_endpoint(
    payload: RecordQuizResultRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> QuizResultOut:
    try:
        return record_quiz_result(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/progress/my-summary", response_model=MySummaryResponse)
def my_summary_endpoint(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> MySummaryResponse:
    return get_my_summary(db, user)
