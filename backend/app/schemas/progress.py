from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

_VALID_DOMAINS = {"nlp", "dl"}


class RecordProgressRequest(BaseModel):
    domain: str
    module_id: str = Field(..., min_length=1, max_length=64)
    task_id: str = Field("page", min_length=1, max_length=64)
    status: str = Field("completed", pattern="^(not_started|in_progress|completed)$")
    completion_percentage: int = Field(100, ge=0, le=100)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        if v not in _VALID_DOMAINS:
            raise ValueError("domain must be 'nlp' or 'dl'.")
        return v


class ProgressEntryOut(BaseModel):
    id: int
    domain: str
    module_id: str
    task_id: str
    status: str
    completion_percentage: int
    completed_at: datetime | None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecordQuizResultRequest(BaseModel):
    domain: str
    quiz_id: str = Field(..., min_length=1, max_length=64)
    total_questions: int = Field(..., ge=1)
    correct_answers: int = Field(..., ge=0)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        if v not in _VALID_DOMAINS:
            raise ValueError("domain must be 'nlp' or 'dl'.")
        return v

    @field_validator("correct_answers")
    @classmethod
    def validate_correct_le_total(cls, v: int, info) -> int:
        total = info.data.get("total_questions")
        if total is not None and v > total:
            raise ValueError("correct_answers cannot exceed total_questions.")
        return v


class QuizResultOut(BaseModel):
    id: int
    domain: str
    quiz_id: str
    score: int
    total_questions: int
    correct_answers: int
    attempted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BadgeOut(BaseModel):
    key: str
    label: str
    description: str


class ActivityItemOut(BaseModel):
    activity_type: str
    domain: str | None
    activity_reference: str | None
    detail: str | None
    timestamp: datetime


class DomainProgressOut(BaseModel):
    completed: int
    total: int
    percentage: int


class CompletedModuleIdsOut(BaseModel):
    nlp: list[str]
    dl: list[str]


class MySummaryResponse(BaseModel):
    nlp_progress: DomainProgressOut
    dl_progress: DomainProgressOut
    completed_tasks: int
    quiz_attempts: int
    average_quiz_score: float | None
    badges: list[BadgeOut]
    recent_activity: list[ActivityItemOut]
    # Which exact lessons are done — what lets the frontend restore each
    # page's "Mark as complete" button to its already-completed state on
    # login, rather than only knowing an aggregate count.
    completed_module_ids: CompletedModuleIdsOut
