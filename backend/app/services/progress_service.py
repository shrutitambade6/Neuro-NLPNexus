"""
Student-facing progress tracking: recording lesson/lab completions and quiz
attempts, logging the real activity feed, and summarizing a student's own
progress. Mirrors this project's algorithms (pure) -> services (I/O)
convention — app/algorithms/badges.py and progress_catalog.py hold the pure
logic, this module is what persists and queries it.

Every function here is scoped to a single `User` object the caller already
authenticated (see app/api/deps.py) — nothing in this file accepts a bare
user_id from the request body, so a student can never read or write
another student's rows through these endpoints.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.algorithms.badges import Badge, compute_badges
from app.algorithms.progress_catalog import CATALOG_BY_DOMAIN, total_lessons, valid_module_ids
from app.models.orm_models import ActivityLog, LearningProgress, QuizResult, User
from app.schemas.progress import (
    ActivityItemOut,
    BadgeOut,
    CompletedModuleIdsOut,
    DomainProgressOut,
    MySummaryResponse,
    ProgressEntryOut,
    QuizResultOut,
    RecordProgressRequest,
    RecordQuizResultRequest,
)

_RECENT_ACTIVITY_LIMIT = 10


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _log_activity(
    db: Session,
    user: User,
    activity_type: str,
    *,
    domain: str | None = None,
    reference: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        ActivityLog(
            user_id=user.id,
            activity_type=activity_type,
            domain=domain,
            activity_reference=reference,
            detail=detail,
        )
    )


def _completed_module_ids_by_domain(db: Session, user_id: int) -> dict[str, set[str]]:
    rows = (
        db.query(LearningProgress.domain, LearningProgress.module_id)
        .filter(LearningProgress.user_id == user_id, LearningProgress.status == "completed")
        .all()
    )
    result: dict[str, set[str]] = {"nlp": set(), "dl": set()}
    for domain, module_id in rows:
        result.setdefault(domain, set()).add(module_id)
    return result


def _quiz_scores(db: Session, user_id: int) -> list[int]:
    return [score for (score,) in db.query(QuizResult.score).filter(QuizResult.user_id == user_id).all()]


def _badges_for_user(db: Session, user_id: int) -> list[Badge]:
    return compute_badges(
        completed_module_ids_by_domain=_completed_module_ids_by_domain(db, user_id),
        total_lessons_by_domain={"nlp": total_lessons("nlp"), "dl": total_lessons("dl")},
        quiz_scores=_quiz_scores(db, user_id),
    )


def _award_new_badges(db: Session, user: User, badges_before: list[Badge]) -> None:
    """Compares badge state before/after a progress-changing write and logs
    an activity_log row for any badge that's newly present — this is the
    only place "badge_earned" activities come from, and it's always a real
    before/after comparison, never guessed."""
    keys_before = {b.key for b in badges_before}
    for badge in _badges_for_user(db, user.id):
        if badge.key not in keys_before:
            _log_activity(
                db, user, "badge_earned", reference=badge.key, detail=f"Earned the '{badge.label}' badge."
            )


def record_progress(db: Session, user: User, payload: RecordProgressRequest) -> ProgressEntryOut:
    if payload.module_id not in valid_module_ids(payload.domain):
        raise ValueError(f"'{payload.module_id}' is not a recognized {payload.domain.upper()} lesson.")

    badges_before = _badges_for_user(db, user.id)

    entry = (
        db.query(LearningProgress)
        .filter(
            LearningProgress.user_id == user.id,
            LearningProgress.domain == payload.domain,
            LearningProgress.module_id == payload.module_id,
            LearningProgress.task_id == payload.task_id,
        )
        .first()
    )
    now = _utcnow()
    if entry is None:
        entry = LearningProgress(
            user_id=user.id,
            domain=payload.domain,
            module_id=payload.module_id,
            task_id=payload.task_id,
        )
        db.add(entry)

    entry.status = payload.status
    entry.completion_percentage = payload.completion_percentage
    entry.completed_at = now if payload.status == "completed" else None
    entry.updated_at = now

    if payload.status == "completed":
        activity_type = "lesson_complete" if payload.domain == "nlp" else "lab_complete"
        label = next(
            (lesson.label for lesson in CATALOG_BY_DOMAIN.get(payload.domain, []) if lesson.module_id == payload.module_id),
            payload.module_id,
        )
        _log_activity(db, user, activity_type, domain=payload.domain, reference=payload.module_id, detail=f"Completed {label}.")

    db.commit()
    db.refresh(entry)
    _award_new_badges(db, user, badges_before)
    db.commit()
    return ProgressEntryOut.model_validate(entry)


def record_quiz_result(db: Session, user: User, payload: RecordQuizResultRequest) -> QuizResultOut:
    badges_before = _badges_for_user(db, user.id)

    score = round((payload.correct_answers / payload.total_questions) * 100)
    result = QuizResult(
        user_id=user.id,
        domain=payload.domain,
        quiz_id=payload.quiz_id,
        score=score,
        total_questions=payload.total_questions,
        correct_answers=payload.correct_answers,
    )
    db.add(result)
    _log_activity(
        db,
        user,
        "quiz_attempt",
        domain=payload.domain,
        reference=payload.quiz_id,
        detail=f"Scored {score}% on a {payload.domain.upper()} quiz ({payload.correct_answers}/{payload.total_questions}).",
    )
    db.commit()
    db.refresh(result)
    _award_new_badges(db, user, badges_before)
    db.commit()
    return QuizResultOut.model_validate(result)


def _domain_progress(completed_ids: set[str], domain: str) -> DomainProgressOut:
    total = total_lessons(domain)
    completed = len(completed_ids)
    pct = round((completed / total) * 100) if total else 0
    return DomainProgressOut(completed=completed, total=total, percentage=pct)


def get_my_summary(db: Session, user: User) -> MySummaryResponse:
    completed_by_domain = _completed_module_ids_by_domain(db, user.id)
    quiz_scores = _quiz_scores(db, user.id)
    badges = _badges_for_user(db, user.id)

    recent = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(_RECENT_ACTIVITY_LIMIT)
        .all()
    )

    return MySummaryResponse(
        nlp_progress=_domain_progress(completed_by_domain.get("nlp", set()), "nlp"),
        dl_progress=_domain_progress(completed_by_domain.get("dl", set()), "dl"),
        completed_tasks=sum(len(v) for v in completed_by_domain.values()),
        quiz_attempts=len(quiz_scores),
        average_quiz_score=round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else None,
        badges=[BadgeOut(key=b.key, label=b.label, description=b.description) for b in badges],
        recent_activity=[
            ActivityItemOut(
                activity_type=a.activity_type,
                domain=a.domain,
                activity_reference=a.activity_reference,
                detail=a.detail,
                timestamp=a.timestamp,
            )
            for a in recent
        ],
        completed_module_ids=CompletedModuleIdsOut(
            nlp=sorted(completed_by_domain.get("nlp", set())),
            dl=sorted(completed_by_domain.get("dl", set())),
        ),
    )
