from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.database import get_db
from app.models.orm_models import User
from app.schemas.book_progress import (
    BookProgressEntryOut,
    BookProgressSummaryOut,
    RecordBookProgressRequest,
    ToggleBookBookmarkRequest,
)
from app.services.book_progress_service import get_book_progress_summary, record_book_progress, toggle_bookmark

router = APIRouter()


@router.post("/books/progress", response_model=BookProgressEntryOut)
def record_book_progress_endpoint(
    payload: RecordBookProgressRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> BookProgressEntryOut:
    try:
        return record_book_progress(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/books/bookmark", response_model=BookProgressEntryOut)
def toggle_book_bookmark_endpoint(
    payload: ToggleBookBookmarkRequest,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> BookProgressEntryOut:
    try:
        return toggle_bookmark(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/books/{book_id}/progress", response_model=BookProgressSummaryOut)
def get_book_progress_endpoint(
    book_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> BookProgressSummaryOut:
    if book_id not in ("nlp", "dl"):
        raise HTTPException(status_code=422, detail="book_id must be 'nlp' or 'dl'.")
    return get_book_progress_summary(db, user, book_id)
