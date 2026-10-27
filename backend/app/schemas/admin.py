from datetime import datetime

from pydantic import BaseModel

from app.schemas.progress import ActivityItemOut, BadgeOut, DomainProgressOut, ProgressEntryOut, QuizResultOut


class StudentSummaryOut(BaseModel):
    id: int
    username: str
    # Username/Password Authentication milestone (2026-10-07) — most
    # students now have no email at all (signup never collects one); see
    # orm_models.User.email's own comment.
    email: str | None = None
    # Username/Password Authentication milestone (2026-10-07) — same
    # reasoning as email directly above: the teacher-facing roster should
    # prefer this now that email is usually absent.
    full_name: str | None = None
    created_at: datetime
    last_login: datetime | None
    is_verified: bool
    nlp_progress: DomainProgressOut
    dl_progress: DomainProgressOut
    quiz_attempts: int
    average_quiz_score: float | None
    badges_earned: int
    last_activity_at: datetime | None


class StudentListResponse(BaseModel):
    students: list[StudentSummaryOut]
    total: int


class StudentDetailResponse(BaseModel):
    student: StudentSummaryOut
    nlp_entries: list[ProgressEntryOut]
    dl_entries: list[ProgressEntryOut]
    quiz_results: list[QuizResultOut]
    badges: list[BadgeOut]
    activity_history: list[ActivityItemOut]


class AdminOverviewResponse(BaseModel):
    total_students: int
    active_students_7d: int
    nlp_progress: DomainProgressOut  # averaged across all students
    dl_progress: DomainProgressOut
    overall_completion_percentage: int
    total_completed_modules: int
    total_completed_lessons: int
    total_quiz_attempts: int
    average_quiz_score: float | None
    total_badges_earned: int
    recent_activity: list[ActivityItemOut]


# ---- Teacher Dashboard expansion: NLP/DL Analytics, Assessments, Needs
# Attention, Class Progress Heatmap. Every field below is computed from
# rows that already exist in learning_progress / quiz_results /
# activity_log — nothing here adds a new table or persists a derived
# value, matching the "store only the minimum necessary data" constraint.


class ModuleCompletionOut(BaseModel):
    module_id: str
    label: str
    completed_count: int
    in_progress_count: int
    not_started_count: int
    completion_percentage: int  # completed_count / total_students, rounded


class ScoreDistributionBucketOut(BaseModel):
    label: str  # e.g. "0-59%", "60-69%", ...
    count: int


class QuizTopicPerformanceOut(BaseModel):
    quiz_id: str
    domain: str
    attempts: int
    average_score: float
    # Share of attempts scoring >= PASS_THRESHOLD (see admin_service.py) —
    # named explicitly rather than just "pass_rate" so the number's meaning
    # travels with it into the UI.
    pass_rate_percentage: int


class DomainAnalyticsResponse(BaseModel):
    domain: str
    total_students: int
    class_completion_percentage: int
    modules: list[ModuleCompletionOut]
    quiz_topics: list[QuizTopicPerformanceOut]
    score_distribution: list[ScoreDistributionBucketOut]
    average_quiz_score: float | None
    total_quiz_attempts: int


class AssessmentsResponse(BaseModel):
    total_attempts: int
    average_score: float | None
    score_distribution: list[ScoreDistributionBucketOut]
    topic_performance: list[QuizTopicPerformanceOut]


class AttentionReasonOut(BaseModel):
    # A fixed, small vocabulary of objective, factual codes — never a
    # judgment label like "weak" or "struggling". See admin_service.py's
    # NEEDS_ATTENTION_* constants for the exact thresholds each one checks.
    code: str
    detail: str


class AttentionItemOut(BaseModel):
    student: StudentSummaryOut
    reasons: list[AttentionReasonOut]


class NeedsAttentionResponse(BaseModel):
    students: list[AttentionItemOut]
    generated_at: datetime


class HeatmapCellOut(BaseModel):
    module_id: str
    # "completed" | "in_progress" | "needs_attention" | "not_started" —
    # "needs_attention" means an in_progress row that hasn't been touched
    # in NEEDS_ATTENTION_STALE_DAYS; everything else is a direct read of
    # the real status column.
    state: str


class HeatmapRowOut(BaseModel):
    student_id: int
    username: str
    cells: list[HeatmapCellOut]


class HeatmapResponse(BaseModel):
    domain: str
    module_ids: list[str]
    module_labels: list[str]
    rows: list[HeatmapRowOut]
