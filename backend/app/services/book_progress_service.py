"""
Reading progress + bookmarks for the Interactive Learning Books. Mirrors
this project's algorithms (pure) -> services (I/O) convention — see
progress_service.py's own module docstring for the original statement of
this pattern. BookProgress is a separate table from LearningProgress on
purpose; see that model's docstring in app/models/orm_models.py for why.

Every function here is scoped to a single `User` object the caller already
authenticated (app/api/deps.py), so a student can never read or write
another student's book progress.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.algorithms.book_catalog import total_chapters, valid_chapter_ids
from app.models.orm_models import BookProgress, User
from app.schemas.book_progress import (
    BookProgressEntryOut,
    BookProgressSummaryOut,
    RecordBookProgressRequest,
    ToggleBookBookmarkRequest,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _get_or_create(db: Session, user_id: int, book_id: str, chapter_id: str) -> BookProgress:
    entry = (
        db.query(BookProgress)
        .filter(BookProgress.user_id == user_id, BookProgress.book_id == book_id, BookProgress.chapter_id == chapter_id)
        .first()
    )
    if entry is None:
        entry = BookProgress(user_id=user_id, book_id=book_id, chapter_id=chapter_id)
        db.add(entry)
    return entry


def record_book_progress(db: Session, user: User, payload: RecordBookProgressRequest) -> BookProgressEntryOut:
    if payload.chapter_id not in valid_chapter_ids(payload.book_id):
        raise ValueError(f"'{payload.chapter_id}' is not a recognized chapter of the {payload.book_id.upper()} book.")

    entry = _get_or_create(db, user.id, payload.book_id, payload.chapter_id)
    entry.last_page_in_chapter = payload.last_page_in_chapter
    # A chapter already marked completed stays completed even if the
    # student revisits an earlier page in it later — reading it again
    # isn't "un-reading" it.
    entry.completed = entry.completed or payload.completed
    entry.updated_at = _utcnow()
    db.commit()
    db.refresh(entry)
    return BookProgressEntryOut.model_validate(entry)


def toggle_bookmark(db: Session, user: User, payload: ToggleBookBookmarkRequest) -> BookProgressEntryOut:
    if payload.chapter_id not in valid_chapter_ids(payload.book_id):
        raise ValueError(f"'{payload.chapter_id}' is not a recognized chapter of the {payload.book_id.upper()} book.")

    entry = _get_or_create(db, user.id, payload.book_id, payload.chapter_id)
    entry.bookmarked = not entry.bookmarked
    entry.updated_at = _utcnow()
    db.commit()
    db.refresh(entry)
    return BookProgressEntryOut.model_validate(entry)


def get_book_progress_summary(db: Session, user: User, book_id: str) -> BookProgressSummaryOut:
    rows = (
        db.query(BookProgress)
        .filter(BookProgress.user_id == user.id, BookProgress.book_id == book_id)
        .order_by(BookProgress.updated_at.desc())
        .all()
    )
    total = total_chapters(book_id)
    completed = sum(1 for r in rows if r.completed)
    percentage = round((completed / total) * 100) if total else 0
    most_recent = rows[0] if rows else None

    return BookProgressSummaryOut(
        book_id=book_id,
        completed_chapters=completed,
        total_chapters=total,
        percentage=percentage,
        resume_chapter_id=most_recent.chapter_id if most_recent else None,
        resume_page_in_chapter=most_recent.last_page_in_chapter if most_recent else 0,
        entries=[BookProgressEntryOut.model_validate(r) for r in rows],
    )
