"""
Teacher/Admin dashboard queries: the class overview, the searchable student
list, and one student's full detail. Every function here requires an
already-authenticated admin `User` to have been resolved by the caller
(see app/api/deps.require_admin) — nothing in this module itself re-checks
role, so it must never be called from a student-facing route.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.algorithms.badges import compute_badges
from app.algorithms.progress_catalog import CATALOG_BY_DOMAIN, total_lessons
from app.models.orm_models import ActivityLog, LearningProgress, QuizResult, User
from app.schemas.admin import (
    AdminOverviewResponse,
    AssessmentsResponse,
    AttentionItemOut,
    AttentionReasonOut,
    DomainAnalyticsResponse,
    HeatmapCellOut,
    HeatmapResponse,
    HeatmapRowOut,
    ModuleCompletionOut,
    NeedsAttentionResponse,
    QuizTopicPerformanceOut,
    ScoreDistributionBucketOut,
    StudentDetailResponse,
    StudentListResponse,
    StudentSummaryOut,
)
from app.schemas.progress import ActivityItemOut, BadgeOut, DomainProgressOut, ProgressEntryOut, QuizResultOut

ACTIVE_WINDOW_DAYS = 7
_RECENT_ACTIVITY_LIMIT = 20


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _completed_module_ids(db: Session, user_id: int) -> dict[str, set[str]]:
    rows = (
        db.query(LearningProgress.domain, LearningProgress.module_id)
        .filter(LearningProgress.user_id == user_id, LearningProgress.status == "completed")
        .all()
    )
    result: dict[str, set[str]] = {"nlp": set(), "dl": set()}
    for domain, module_id in rows:
        result.setdefault(domain, set()).add(module_id)
    return result


def _domain_progress(completed_ids: set[str], domain: str) -> DomainProgressOut:
    total = total_lessons(domain)
    completed = len(completed_ids)
    pct = round((completed / total) * 100) if total else 0
    return DomainProgressOut(completed=completed, total=total, percentage=pct)


def _summarize_student(db: Session, student: User) -> StudentSummaryOut:
    completed = _completed_module_ids(db, student.id)
    quiz_scores = [s for (s,) in db.query(QuizResult.score).filter(QuizResult.user_id == student.id).all()]
    badges = compute_badges(
        completed_module_ids_by_domain=completed,
        total_lessons_by_domain={"nlp": total_lessons("nlp"), "dl": total_lessons("dl")},
        quiz_scores=quiz_scores,
    )
    last_activity = (
        db.query(ActivityLog.timestamp)
        .filter(ActivityLog.user_id == student.id)
        .order_by(ActivityLog.timestamp.desc())
        .first()
    )

    return StudentSummaryOut(
        id=student.id,
        username=student.username,
        email=student.email,
        # Username/Password Authentication milestone (2026-10-07) -- see
        # StudentSummaryOut.full_name's own comment in schemas/admin.py.
        full_name=student.full_name,
        created_at=student.created_at,
        last_login=student.last_login,
        is_verified=student.is_verified,
        nlp_progress=_domain_progress(completed.get("nlp", set()), "nlp"),
        dl_progress=_domain_progress(completed.get("dl", set()), "dl"),
        quiz_attempts=len(quiz_scores),
        average_quiz_score=round(sum(quiz_scores) / len(quiz_scores), 1) if quiz_scores else None,
        badges_earned=len(badges),
        last_activity_at=last_activity[0] if last_activity else None,
    )


def list_students(db: Session, search: str | None = None) -> StudentListResponse:
    query = db.query(User).filter(User.role == "student")
    if search:
        like = f"%{search.strip().lower()}%"
        query = query.filter(
            (User.username.ilike(like)) | (User.email.ilike(like))
        )
    students = query.order_by(User.created_at.desc()).all()
    return StudentListResponse(
        students=[_summarize_student(db, s) for s in students],
        total=len(students),
    )


def get_student_detail(db: Session, student_id: int) -> StudentDetailResponse:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise ValueError("No student with that id.")

    summary = _summarize_student(db, student)
    entries = (
        db.query(LearningProgress)
        .filter(LearningProgress.user_id == student_id)
        .order_by(LearningProgress.updated_at.desc())
        .all()
    )
    quiz_results = (
        db.query(QuizResult).filter(QuizResult.user_id == student_id).order_by(QuizResult.attempted_at.desc()).all()
    )
    activity = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == student_id)
        .order_by(ActivityLog.timestamp.desc())
        .limit(_RECENT_ACTIVITY_LIMIT)
        .all()
    )
    completed = _completed_module_ids(db, student_id)
    quiz_scores = [q.score for q in quiz_results]
    badges = compute_badges(
        completed_module_ids_by_domain=completed,
        total_lessons_by_domain={"nlp": total_lessons("nlp"), "dl": total_lessons("dl")},
        quiz_scores=quiz_scores,
    )

    return StudentDetailResponse(
        student=summary,
        nlp_entries=[ProgressEntryOut.model_validate(e) for e in entries if e.domain == "nlp"],
        dl_entries=[ProgressEntryOut.model_validate(e) for e in entries if e.domain == "dl"],
        quiz_results=[QuizResultOut.model_validate(q) for q in quiz_results],
        badges=[BadgeOut(key=b.key, label=b.label, description=b.description) for b in badges],
        activity_history=[
            ActivityItemOut(
                activity_type=a.activity_type,
                domain=a.domain,
                activity_reference=a.activity_reference,
                detail=a.detail,
                timestamp=a.timestamp,
            )
            for a in activity
        ],
    )


def get_admin_overview(db: Session) -> AdminOverviewResponse:
    students = db.query(User).filter(User.role == "student").all()
    total_students = len(students)

    cutoff = _utcnow() - timedelta(days=ACTIVE_WINDOW_DAYS)
    active_students = sum(1 for s in students if s.last_login and _as_aware(s.last_login) >= cutoff)

    nlp_completed_total = 0
    dl_completed_total = 0
    total_quiz_attempts = 0
    all_quiz_scores: list[int] = []
    total_badges = 0
    distinct_completed_modules: set[tuple[int, str, str]] = set()
    total_completed_lesson_rows = 0

    for student in students:
        completed = _completed_module_ids(db, student.id)
        nlp_completed_total += len(completed.get("nlp", set()))
        dl_completed_total += len(completed.get("dl", set()))
        for domain, ids in completed.items():
            for module_id in ids:
                distinct_completed_modules.add((student.id, domain, module_id))
        total_completed_lesson_rows += len(completed.get("nlp", set())) + len(completed.get("dl", set()))

        scores = [s for (s,) in db.query(QuizResult.score).filter(QuizResult.user_id == student.id).all()]
        total_quiz_attempts += len(scores)
        all_quiz_scores.extend(scores)

        badges = compute_badges(
            completed_module_ids_by_domain=completed,
            total_lessons_by_domain={"nlp": total_lessons("nlp"), "dl": total_lessons("dl")},
            quiz_scores=scores,
        )
        total_badges += len(badges)

    nlp_total_possible = total_lessons("nlp") * max(total_students, 1)
    dl_total_possible = total_lessons("dl") * max(total_students, 1)
    nlp_pct = round((nlp_completed_total / nlp_total_possible) * 100) if nlp_total_possible else 0
    dl_pct = round((dl_completed_total / dl_total_possible) * 100) if dl_total_possible else 0
    overall_possible = nlp_total_possible + dl_total_possible
    overall_completed = nlp_completed_total + dl_completed_total
    overall_pct = round((overall_completed / overall_possible) * 100) if overall_possible else 0

    recent = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(_RECENT_ACTIVITY_LIMIT).all()

    return AdminOverviewResponse(
        total_students=total_students,
        active_students_7d=active_students,
        nlp_progress=DomainProgressOut(completed=nlp_completed_total, total=nlp_total_possible, percentage=nlp_pct),
        dl_progress=DomainProgressOut(completed=dl_completed_total, total=dl_total_possible, percentage=dl_pct),
        overall_completion_percentage=overall_pct,
        total_completed_modules=len(distinct_completed_modules),
        total_completed_lessons=total_completed_lesson_rows,
        total_quiz_attempts=total_quiz_attempts,
        average_quiz_score=round(sum(all_quiz_scores) / len(all_quiz_scores), 1) if all_quiz_scores else None,
        total_badges_earned=total_badges,
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
    )


def _as_aware(dt: datetime) -> datetime:
    """SQLite stores DateTime naive — treat it as UTC (everything in this
    project writes UTC timestamps) so comparisons against an aware `cutoff`
    don't raise."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


# ---- Teacher Dashboard expansion -----------------------------------------
#
# Needs Attention thresholds: a small, fixed, named set of rules, each
# checked against columns that already exist (learning_progress,
# quiz_results, activity_log). No judgment labels ("weak", "struggling")
# are ever produced — only a code + a factual, numeric detail string.
NEEDS_ATTENTION_STALE_DAYS = 14
NEEDS_ATTENTION_INACTIVITY_DAYS = 14
NEEDS_ATTENTION_MIN_ACCOUNT_AGE_DAYS = 7
NEEDS_ATTENTION_LOW_PROGRESS_PCT = 20
NEEDS_ATTENTION_FAILED_QUIZ_SCORE = 50
NEEDS_ATTENTION_FAILED_QUIZ_REPEATS = 2

# Used only for the "pass rate" analytics number shown per quiz topic.
QUIZ_PASS_SCORE = 60
_SCORE_BUCKETS = [(0, 59, "0-59%"), (60, 69, "60-69%"), (70, 79, "70-79%"), (80, 89, "80-89%"), (90, 100, "90-100%")]


def _student_user_ids(db: Session) -> list[int]:
    return [uid for (uid,) in db.query(User.id).filter(User.role == "student").all()]


def _score_distribution(scores: list[int]) -> list[ScoreDistributionBucketOut]:
    return [
        ScoreDistributionBucketOut(label=label, count=sum(1 for s in scores if lo <= s <= hi))
        for lo, hi, label in _SCORE_BUCKETS
    ]


def _topic_performance(rows: list[QuizResult]) -> list[QuizTopicPerformanceOut]:
    by_quiz: dict[tuple[str, str], list[int]] = {}
    for r in rows:
        by_quiz.setdefault((r.domain, r.quiz_id), []).append(r.score)
    out = []
    for (domain, quiz_id), scores in sorted(by_quiz.items()):
        passed = sum(1 for s in scores if s >= QUIZ_PASS_SCORE)
        out.append(
            QuizTopicPerformanceOut(
                quiz_id=quiz_id,
                domain=domain,
                attempts=len(scores),
                average_score=round(sum(scores) / len(scores), 1),
                pass_rate_percentage=round((passed / len(scores)) * 100),
            )
        )
    return out


def get_domain_analytics(db: Session, domain: str) -> DomainAnalyticsResponse:
    if domain not in CATALOG_BY_DOMAIN:
        raise ValueError("domain must be 'nlp' or 'dl'.")

    student_ids = _student_user_ids(db)
    total_students = len(student_ids)
    lessons = CATALOG_BY_DOMAIN[domain]

    progress_rows = (
        db.query(LearningProgress.user_id, LearningProgress.module_id, LearningProgress.status)
        .filter(LearningProgress.user_id.in_(student_ids), LearningProgress.domain == domain)
        .all()
        if student_ids
        else []
    )
    # "completed" always wins over "in_progress" for the same user+module —
    # a lesson that was ever finished stays finished even if an older,
    # separate in_progress row also exists for it.
    status_by_user_module: dict[tuple[int, str], str] = {}
    for user_id, module_id, status in progress_rows:
        key = (user_id, module_id)
        if status_by_user_module.get(key) != "completed":
            status_by_user_module[key] = status

    modules: list[ModuleCompletionOut] = []
    total_completed_across_modules = 0
    for lesson in lessons:
        completed = sum(1 for (_uid, mid), st in status_by_user_module.items() if mid == lesson.module_id and st == "completed")
        in_progress = sum(1 for (_uid, mid), st in status_by_user_module.items() if mid == lesson.module_id and st == "in_progress")
        not_started = max(total_students - completed - in_progress, 0)
        total_completed_across_modules += completed
        modules.append(
            ModuleCompletionOut(
                module_id=lesson.module_id,
                label=lesson.label,
                completed_count=completed,
                in_progress_count=in_progress,
                not_started_count=not_started,
                completion_percentage=round((completed / total_students) * 100) if total_students else 0,
            )
        )

    possible = len(lessons) * total_students
    class_pct = round((total_completed_across_modules / possible) * 100) if possible else 0

    quiz_rows = (
        db.query(QuizResult).filter(QuizResult.user_id.in_(student_ids), QuizResult.domain == domain).all()
        if student_ids
        else []
    )
    scores = [q.score for q in quiz_rows]

    return DomainAnalyticsResponse(
        domain=domain,
        total_students=total_students,
        class_completion_percentage=class_pct,
        modules=modules,
        quiz_topics=_topic_performance(quiz_rows),
        score_distribution=_score_distribution(scores),
        average_quiz_score=round(sum(scores) / len(scores), 1) if scores else None,
        total_quiz_attempts=len(scores),
    )


def get_assessments(db: Session) -> AssessmentsResponse:
    student_ids = _student_user_ids(db)
    rows = db.query(QuizResult).filter(QuizResult.user_id.in_(student_ids)).all() if student_ids else []
    scores = [q.score for q in rows]
    return AssessmentsResponse(
        total_attempts=len(scores),
        average_score=round(sum(scores) / len(scores), 1) if scores else None,
        score_distribution=_score_distribution(scores),
        topic_performance=_topic_performance(rows),
    )


def get_needs_attention(db: Session) -> NeedsAttentionResponse:
    now = _utcnow()
    students = db.query(User).filter(User.role == "student").all()
    nlp_total, dl_total = total_lessons("nlp"), total_lessons("dl")
    total_possible = nlp_total + dl_total
    stale_cutoff = now - timedelta(days=NEEDS_ATTENTION_STALE_DAYS)
    inactivity_cutoff = now - timedelta(days=NEEDS_ATTENTION_INACTIVITY_DAYS)

    items: list[AttentionItemOut] = []
    for student in students:
        account_age_days = (now - _as_aware(student.created_at)).days
        if account_age_days < NEEDS_ATTENTION_MIN_ACCOUNT_AGE_DAYS:
            continue  # too new to judge fairly — give them the onboarding window first

        reasons: list[AttentionReasonOut] = []

        completed = _completed_module_ids(db, student.id)
        total_completed = len(completed.get("nlp", set())) + len(completed.get("dl", set()))
        overall_pct = round((total_completed / total_possible) * 100) if total_possible else 0
        if overall_pct < NEEDS_ATTENTION_LOW_PROGRESS_PCT:
            reasons.append(
                AttentionReasonOut(
                    code="low_progress",
                    detail=f"Completed {overall_pct}% of available lessons after {account_age_days} days enrolled.",
                )
            )

        quiz_scores = [s for (s,) in db.query(QuizResult.score).filter(QuizResult.user_id == student.id).all()]
        failed = sum(1 for s in quiz_scores if s < NEEDS_ATTENTION_FAILED_QUIZ_SCORE)
        if failed >= NEEDS_ATTENTION_FAILED_QUIZ_REPEATS:
            reasons.append(
                AttentionReasonOut(
                    code="failed_quizzes",
                    detail=f"Scored below {NEEDS_ATTENTION_FAILED_QUIZ_SCORE}% on {failed} of {len(quiz_scores)} quiz attempt(s).",
                )
            )

        in_progress_entries = (
            db.query(LearningProgress)
            .filter(LearningProgress.user_id == student.id, LearningProgress.status == "in_progress")
            .all()
        )
        stale_count = sum(1 for e in in_progress_entries if _as_aware(e.updated_at) < stale_cutoff)
        if stale_count > 0:
            reasons.append(
                AttentionReasonOut(
                    code="incomplete_labs",
                    detail=f"{stale_count} lab(s) started but not updated in over {NEEDS_ATTENTION_STALE_DAYS} days.",
                )
            )

        last_activity = (
            db.query(ActivityLog.timestamp)
            .filter(ActivityLog.user_id == student.id)
            .order_by(ActivityLog.timestamp.desc())
            .first()
        )
        if not last_activity or _as_aware(last_activity[0]) < inactivity_cutoff:
            days_since = (now - _as_aware(last_activity[0])).days if last_activity else account_age_days
            reasons.append(
                AttentionReasonOut(code="inactivity", detail=f"No recorded activity in the last {days_since} days.")
            )

        if reasons:
            items.append(AttentionItemOut(student=_summarize_student(db, student), reasons=reasons))

    items.sort(key=lambda it: len(it.reasons), reverse=True)
    return NeedsAttentionResponse(students=items, generated_at=now)


def get_heatmap(db: Session, domain: str) -> HeatmapResponse:
    if domain not in CATALOG_BY_DOMAIN:
        raise ValueError("domain must be 'nlp' or 'dl'.")

    lessons = CATALOG_BY_DOMAIN[domain]
    students = db.query(User).filter(User.role == "student").order_by(User.username.asc()).all()
    now = _utcnow()
    stale_cutoff = now - timedelta(days=NEEDS_ATTENTION_STALE_DAYS)

    rows: list[HeatmapRowOut] = []
    for student in students:
        entries = (
            db.query(LearningProgress)
            .filter(LearningProgress.user_id == student.id, LearningProgress.domain == domain)
            .all()
        )
        by_module: dict[str, LearningProgress] = {}
        for e in entries:
            existing = by_module.get(e.module_id)
            if existing is None or (e.status == "completed" and existing.status != "completed"):
                by_module[e.module_id] = e

        cells: list[HeatmapCellOut] = []
        for lesson in lessons:
            entry = by_module.get(lesson.module_id)
            if entry is None:
                state = "not_started"
            elif entry.status == "completed":
                state = "completed"
            elif entry.status == "in_progress" and _as_aware(entry.updated_at) < stale_cutoff:
                state = "needs_attention"
            else:
                state = "in_progress"
            cells.append(HeatmapCellOut(module_id=lesson.module_id, state=state))

        rows.append(HeatmapRowOut(student_id=student.id, username=student.username, cells=cells))

    return HeatmapResponse(
        domain=domain,
        module_ids=[lesson.module_id for lesson in lessons],
        module_labels=[lesson.label for lesson in lessons],
        rows=rows,
    )
