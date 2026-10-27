from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_VALID_BOOKS = {"nlp", "dl"}


class RecordBookProgressRequest(BaseModel):
    book_id: str
    chapter_id: str = Field(..., min_length=1, max_length=64)
    completed: bool = False
    last_page_in_chapter: int = Field(0, ge=0)

    @field_validator("book_id")
    @classmethod
    def validate_book_id(cls, v: str) -> str:
        if v not in _VALID_BOOKS:
            raise ValueError("book_id must be 'nlp' or 'dl'.")
        return v


class ToggleBookBookmarkRequest(BaseModel):
    book_id: str
    chapter_id: str = Field(..., min_length=1, max_length=64)

    @field_validator("book_id")
    @classmethod
    def validate_book_id(cls, v: str) -> str:
        if v not in _VALID_BOOKS:
            raise ValueError("book_id must be 'nlp' or 'dl'.")
        return v


class BookProgressEntryOut(BaseModel):
    chapter_id: str
    completed: bool
    bookmarked: bool
    last_page_in_chapter: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BookProgressSummaryOut(BaseModel):
    book_id: str
    completed_chapters: int
    total_chapters: int
    percentage: int
    # The chapter most recently read/visited (by updated_at) — what "Resume
    # reading: Chapter 08" is computed from. None for a book the student
    # has never opened yet.
    resume_chapter_id: str | None
    resume_page_in_chapter: int
    entries: list[BookProgressEntryOut]
