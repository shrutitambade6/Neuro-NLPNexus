"""
Business logic for the Super Admin Portal — the one centrally-managing
role sitting above Student and Teacher (see app/api/deps.require_super_admin
for the access boundary). Every function here assumes the caller has
already been authenticated AND authorized as role="super_admin" by the
API layer; nothing in this module re-checks that itself.

Reuses existing infrastructure rather than building a parallel one:
progress_catalog for "100% of what", connection_manager for real (not
persisted-but-stale) online status, the existing Report/Block/Discussion/
Message tables from the Community/Chat milestone for moderation, and the
existing admin_service constants for "needs attention"/quiz-pass numbers
surfaced on the Settings page.
"""
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.algorithms.auth import PBKDF2_ITERATIONS, hash_password
from app.algorithms.moderation import RATE_LIMIT_MAX_ACTIONS, RATE_LIMIT_WINDOW_SECONDS
from app.algorithms.progress_catalog import total_lessons
from app.algorithms.security_policy import (
    ACCOUNT_STATUSES,
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    SUPER_ADMIN_SESSION_LIFETIME_SECONDS,
    SUSPICIOUS_ACTIVITY_WINDOW_SECONDS,
    SUSPICIOUS_FAILED_LOGIN_THRESHOLD,
)
from app.models.orm_models import (
    ActivityLog,
    AuditLog,
    Discussion,
    DiscussionReply,
    LearningProgress,
    LoginActivity,
    Message,
    QuizResult,
    Report,
    User,
    UserSession,
)
from app.services.admin_service import NEEDS_ATTENTION_LOW_PROGRESS_PCT, NEEDS_ATTENTION_STALE_DAYS, QUIZ_PASS_SCORE
from app.services.auth_service import TOKEN_EXPIRES_SECONDS, forgot_password
from app.services.connection_manager import connection_manager
from app.services.email_service import email_is_configured

ACTIVE_WINDOW_DAYS = 7
RECENT_EVENTS_LIMIT = 15
AUDIT_LOG_PAGE_SIZE = 50
LOGIN_ACTIVITY_PAGE_SIZE = 50
LEARNING_ACTIVITY_WINDOW_DAYS = 14


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _write_audit_log(db: Session, actor: User, action_type: str, target_user_id: int | None, details: str) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id,
            action_type=action_type,
            target_user_id=target_user_id,
            details=details[:500],
        )
    )
    db.commit()


def _assert_manageable_target(target: User) -> None:
    """A Super Admin can manage student and teacher accounts only — never
    another super_admin, and (since there's exactly one, this also means)
    never itself. This is the one guard that keeps a Super Admin from
    ever locking out the platform's only Super Admin account."""
    if target.role == "super_admin":
        raise ValueError("Super Admin accounts can't be managed from this screen.")


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------


def get_overview(db: Session) -> dict:
    active_cutoff = _utcnow() - timedelta(days=ACTIVE_WINDOW_DAYS)
    week_cutoff = _utcnow() - timedelta(days=7)

    total_students = db.query(User).filter(User.role == "student").count()
    total_teachers = db.query(User).filter(User.role == "admin").count()
    active_users = (
        db.query(User)
        .filter(User.role.in_(["student", "admin"]), User.last_login.isnot(None), User.last_login >= active_cutoff)
        .count()
    )
    registered_this_week = (
        db.query(User).filter(User.role.in_(["student", "admin"]), User.created_at >= week_cutoff).count()
    )
    online_now = len(connection_manager.online_user_ids())

    nlp_activity_count = db.query(ActivityLog).filter(ActivityLog.domain == "nlp").count()
    dl_activity_count = db.query(ActivityLog).filter(ActivityLog.domain == "dl").count()
    completed_labs_count = (
        db.query(LearningProgress).filter(LearningProgress.status == "completed").count()
    )
    quiz_activity_count = db.query(QuizResult).count()
    community_activity_count = (
        db.query(Discussion).count() + db.query(DiscussionReply).count() + db.query(Message).count()
    )
    open_reports_count = db.query(Report).filter(Report.status == "open").count()

    stats = {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "online_now": online_now,
        "registered_this_week": registered_this_week,
        "nlp_activity_count": nlp_activity_count,
        "dl_activity_count": dl_activity_count,
        "completed_labs_count": completed_labs_count,
        "quiz_activity_count": quiz_activity_count,
        "community_activity_count": community_activity_count,
        "open_reports_count": open_reports_count,
    }

    events: list[dict] = []
    for entry in (
        db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(RECENT_EVENTS_LIMIT).all()
    ):
        events.append({"kind": "audit", "summary": f"{entry.actor.username}: {entry.action_type}", "created_at": entry.created_at})
    for entry in (
        db.query(LoginActivity)
        .filter(LoginActivity.success.is_(False))
        .order_by(LoginActivity.created_at.desc())
        .limit(RECENT_EVENTS_LIMIT)
        .all()
    ):
        events.append(
            {
                "kind": "login_failed",
                "summary": f"Failed login for {entry.email_attempted} ({entry.failure_reason})",
                "created_at": entry.created_at,
            }
        )
    for entry in db.query(Report).order_by(Report.created_at.desc()).limit(RECENT_EVENTS_LIMIT).all():
        events.append(
            {
                "kind": "report_filed",
                "summary": f"Report filed against {entry.target_type} #{entry.target_id}",
                "created_at": entry.created_at,
            }
        )
    events.sort(key=lambda e: e["created_at"], reverse=True)
    return {"stats": stats, "recent_events": events[:RECENT_EVENTS_LIMIT]}


# ---------------------------------------------------------------------------
# Students
# ---------------------------------------------------------------------------


def _domain_pct(db: Session, user_id: int, domain: str) -> int:
    completed = (
        db.query(LearningProgress)
        .filter(LearningProgress.user_id == user_id, LearningProgress.domain == domain, LearningProgress.status == "completed")
        .count()
    )
    total = total_lessons(domain)
    return round((completed / total) * 100) if total else 0


def _to_account_summary(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        # Username/Password Authentication milestone (2026-10-07) -- the
        # display identity the Super Admin rosters/detail pages should
        # prefer now that email is usually null (signup no longer collects
        # one). See AccountSummaryOut.full_name's own comment.
        "full_name": user.full_name,
        "role": user.role,
        "account_status": user.account_status,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "is_online": connection_manager.is_online(user.id),
    }


def list_students(db: Session, search: str | None = None) -> dict:
    query = db.query(User).filter(User.role == "student")
    if search:
        like = f"%{search}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))
    students = query.order_by(User.created_at.desc()).all()

    out = []
    for student in students:
        summary = _to_account_summary(student)
        summary.update(
            {
                "nlp_progress_pct": _domain_pct(db, student.id, "nlp"),
                "dl_progress_pct": _domain_pct(db, student.id, "dl"),
                "completed_labs_count": db.query(LearningProgress)
                .filter(LearningProgress.user_id == student.id, LearningProgress.status == "completed")
                .count(),
                "quiz_attempts_count": db.query(QuizResult).filter(QuizResult.user_id == student.id).count(),
            }
        )
        out.append(summary)
    return {"students": out, "total": len(out)}


def get_student_detail(db: Session, student_id: int) -> dict:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise ValueError("No student with that id.")
    summary = _to_account_summary(student)
    summary.update(
        {
            "nlp_progress_pct": _domain_pct(db, student.id, "nlp"),
            "dl_progress_pct": _domain_pct(db, student.id, "dl"),
            "completed_labs_count": db.query(LearningProgress)
            .filter(LearningProgress.user_id == student.id, LearningProgress.status == "completed")
            .count(),
            "quiz_attempts_count": db.query(QuizResult).filter(QuizResult.user_id == student.id).count(),
            "is_verified": student.is_verified,
        }
    )
    return summary


# ---------------------------------------------------------------------------
# Teachers
# ---------------------------------------------------------------------------


def list_teachers(db: Session) -> dict:
    teachers = db.query(User).filter(User.role == "admin").order_by(User.created_at.asc()).all()
    out = []
    for teacher in teachers:
        summary = _to_account_summary(teacher)
        summary.update({"assigned_domain": teacher.assigned_domain, "is_verified": teacher.is_verified})
        out.append(summary)
    return {"teachers": out}


def get_teacher_detail(db: Session, teacher_id: int) -> dict:
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "admin").first()
    if not teacher:
        raise ValueError("No teacher with that id.")
    summary = _to_account_summary(teacher)
    summary.update({"assigned_domain": teacher.assigned_domain, "is_verified": teacher.is_verified})
    return summary


def create_teacher(db: Session, actor: User, username: str, email: str, password: str, assigned_domain: str | None) -> dict:
    email = email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise ValueError("An account with this email already exists.")
    if db.query(User).filter(User.username == username).first():
        raise ValueError("That username is already taken.")
    if assigned_domain not in (None, "nlp", "dl"):
        raise ValueError("assigned_domain must be 'nlp', 'dl', or omitted.")

    teacher = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role="admin",
        is_verified=True,
        assigned_domain=assigned_domain,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    _write_audit_log(db, actor, "teacher_account_created", teacher.id, f"Created teacher account {teacher.email}.")
    return get_teacher_detail(db, teacher.id)


# ---------------------------------------------------------------------------
# Teacher requests -- Student/Teacher self-serve signup follow-up
# (2026-10-07). A request is just a role="student" row with
# teacher_request_pending=True (see User's own comment) -- approving one
# is the ONLY code path, anywhere in this backend, that can turn a
# publicly-registered account into role="admin". create_teacher() above
# (a Super Admin typing in a brand new teacher's details directly) is
# unaffected and still works exactly as it did.
# ---------------------------------------------------------------------------


def list_teacher_requests(db: Session) -> dict:
    requesters = (
        db.query(User)
        .filter(User.teacher_request_pending.is_(True), User.role == "student")
        .order_by(User.created_at.asc())
        .all()
    )
    return {"requests": [_to_account_summary(r) for r in requesters]}


def approve_teacher_request(db: Session, actor: User, user_id: int, assigned_domain: str | None) -> dict:
    target = db.query(User).filter(User.id == user_id, User.teacher_request_pending.is_(True)).first()
    if not target:
        raise ValueError("No pending teacher request with that id.")
    if assigned_domain not in (None, "nlp", "dl"):
        raise ValueError("assigned_domain must be 'nlp', 'dl', or omitted.")

    target.role = "admin"
    target.teacher_request_pending = False
    target.assigned_domain = assigned_domain
    db.commit()
    _write_audit_log(db, actor, "teacher_request_approved", target.id, f"Approved teacher request for {target.email}.")
    return get_teacher_detail(db, target.id)


def reject_teacher_request(db: Session, actor: User, user_id: int) -> dict:
    target = db.query(User).filter(User.id == user_id, User.teacher_request_pending.is_(True)).first()
    if not target:
        raise ValueError("No pending teacher request with that id.")

    target.teacher_request_pending = False
    db.commit()
    _write_audit_log(db, actor, "teacher_request_rejected", target.id, f"Rejected teacher request for {target.email}.")
    return {"id": target.id, "message": "Teacher request rejected — the account remains a student account."}


# ---------------------------------------------------------------------------
# Account status + password reset (shared by students and teachers)
# ---------------------------------------------------------------------------


def update_account_status(db: Session, actor: User, user_id: int, new_status: str, reason: str) -> dict:
    if new_status not in ACCOUNT_STATUSES:
        raise ValueError(f"status must be one of {ACCOUNT_STATUSES}.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise ValueError("No account with that id.")
    _assert_manageable_target(target)

    old_status = target.account_status
    target.account_status = new_status
    db.commit()

    if new_status != "active":
        # Force an effective logout — revoking every currently-valid
        # session is what actually makes a suspension take effect
        # immediately, not just block the next /auth/login call.
        db.query(UserSession).filter(UserSession.user_id == target.id, UserSession.revoked_at.is_(None)).update(
            {"revoked_at": _utcnow()}
        )
        db.commit()

    _write_audit_log(
        db, actor, "account_status_changed", target.id,
        f"{target.email}: {old_status} -> {new_status}. Reason: {reason}",
    )
    return {"id": target.id, "account_status": target.account_status, "message": f"Account status set to {new_status}."}


def trigger_password_reset(db: Session, actor: User, user_id: int) -> dict:
    """Reuses the EXISTING self-service forgot-password flow
    (auth_service.forgot_password) when the target account has a real
    email on file AND this deployment can actually deliver it — the Super
    Admin never sees, and this endpoint never returns, anything that
    could be used to log in as that user; it only emails the account's
    own reset link to the account's own address, exactly as if the user
    had requested it themselves.

    College-email requirement (2026-10-08) -- every student/teacher
    account now has a real @vit.edu.in address on file (see
    schemas.auth.RegisterRequest.college_email), so `target.email` is no
    longer a reliable signal for "can we actually reach this person by
    email". Whether SMTP is configured at all (email_is_configured()) is
    the thing that actually decides it: with no SMTP set up, a reset link
    would silently vanish into forgot_password()'s "never leaks whether
    it sent" contract and the Super Admin would be left staring at
    email_status="not_configured" with no way to help someone locked out.
    So this falls back to the direct-temporary-password path whenever
    either condition fails (no email on file, OR email on file but
    delivery isn't actually configured): generate a real new random
    password directly, set it on the account, revoke every active session
    (same as a normal password reset always has), and return the new
    password to the Super Admin once, in this one response, for them to
    pass on to the account holder out of band. This is a deliberate
    exception to the "never shows the Super Admin a password" rule the
    email-based path above still follows — forced by there being no way
    to get a link to the account holder any other way."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise ValueError("No account with that id.")
    _assert_manageable_target(target)

    if not target.email or not email_is_configured():
        reason = "no email on file" if not target.email else "email delivery isn't configured on this deployment"
        temporary_password = secrets.token_urlsafe(9)  # ~12 chars, well over the 8-char minimum
        target.password_hash = hash_password(temporary_password)
        db.query(UserSession).filter(
            UserSession.user_id == target.id, UserSession.revoked_at.is_(None)
        ).update({"revoked_at": datetime.now(timezone.utc)})
        db.commit()
        _write_audit_log(
            db, actor, "password_reset_triggered", target.id,
            f"Generated a new temporary password for {target.username} ({reason}).",
        )
        return {
            "message": "A reset email couldn't be sent for this account, so a new temporary password was "
            "generated instead. Share it with the account holder yourself — it will not be shown again.",
            "email_status": "no_email",
            "temporary_password": temporary_password,
        }

    result = forgot_password(db, target.email)
    email_status = "sent" if email_is_configured() else "not_configured"
    _write_audit_log(
        db, actor, "password_reset_triggered", target.id,
        f"Triggered a password-reset email for {target.email} (email_status={email_status}).",
    )
    return {"message": result.message, "email_status": email_status, "temporary_password": None}


# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------


def get_security_overview(db: Session) -> dict:
    recent_cutoff = _utcnow() - timedelta(hours=24)
    login_activity = (
        db.query(LoginActivity).order_by(LoginActivity.created_at.desc()).limit(LOGIN_ACTIVITY_PAGE_SIZE).all()
    )
    failed_login_count_24h = (
        db.query(LoginActivity)
        .filter(LoginActivity.success.is_(False), LoginActivity.created_at >= recent_cutoff)
        .count()
    )

    suspicious_cutoff = _utcnow() - timedelta(seconds=SUSPICIOUS_ACTIVITY_WINDOW_SECONDS)
    rows = (
        db.query(LoginActivity.email_attempted)
        .filter(LoginActivity.success.is_(False), LoginActivity.created_at >= suspicious_cutoff)
        .all()
    )
    counts: dict[str, int] = {}
    for (email,) in rows:
        counts[email] = counts.get(email, 0) + 1
    suspicious = [
        {"email_attempted": email, "failed_count": count, "window_minutes": SUSPICIOUS_ACTIVITY_WINDOW_SECONDS // 60}
        for email, count in counts.items()
        if count >= SUSPICIOUS_FAILED_LOGIN_THRESHOLD
    ]
    suspicious.sort(key=lambda s: s["failed_count"], reverse=True)

    active_sessions = (
        db.query(UserSession)
        .filter(UserSession.revoked_at.is_(None), UserSession.expires_at >= _utcnow())
        .order_by(UserSession.created_at.desc())
        .all()
    )
    sessions_out = [
        {
            "id": s.id,
            "user_id": s.user_id,
            "username": s.user.username,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
            "created_at": s.created_at,
            "expires_at": s.expires_at,
        }
        for s in active_sessions
    ]

    return {
        "login_activity": [
            {
                "id": a.id,
                "email_attempted": a.email_attempted,
                "success": a.success,
                "failure_reason": a.failure_reason,
                "ip_address": a.ip_address,
                "created_at": a.created_at,
            }
            for a in login_activity
        ],
        "failed_login_count_24h": failed_login_count_24h,
        "suspicious": suspicious,
        "active_sessions": sessions_out,
    }


def revoke_session(db: Session, actor: User, session_id: int) -> dict:
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session:
        raise ValueError("No session with that id.")
    if session.revoked_at is None:
        session.revoked_at = _utcnow()
        db.commit()
    _write_audit_log(
        db, actor, "session_revoked", session.user_id, f"Revoked session #{session.id} for user #{session.user_id}."
    )
    return {"id": session.id, "message": "Session revoked."}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


def list_audit_log(db: Session, action_type: str | None = None, page: int = 1) -> dict:
    query = db.query(AuditLog)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    total = query.count()
    offset = max(page - 1, 0) * AUDIT_LOG_PAGE_SIZE
    rows = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(AUDIT_LOG_PAGE_SIZE).all()
    entries = [
        {
            "id": r.id,
            "actor_username": r.actor.username,
            "action_type": r.action_type,
            "target_username": r.target_user.username if r.target_user else None,
            "details": r.details,
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return {"entries": entries, "total": total}


# ---------------------------------------------------------------------------
# Community moderation
# ---------------------------------------------------------------------------


def list_reports(db: Session, status_filter: str | None = None) -> dict:
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter)
    reports = query.order_by(Report.created_at.desc()).all()
    out = []
    for r in reports:
        reviewer = db.query(User).filter(User.id == r.reviewed_by).first() if r.reviewed_by else None
        out.append(
            {
                "id": r.id,
                "reporter_username": r.reporter.username,
                "target_type": r.target_type,
                "target_id": r.target_id,
                "reason": r.reason,
                "status": r.status,
                "created_at": r.created_at,
                "reviewed_by_username": reviewer.username if reviewer else None,
                "reviewed_at": r.reviewed_at,
            }
        )
    return {"reports": out}


def get_report_content(db: Session, actor: User, report_id: int) -> dict:
    """The privacy gate: a private MESSAGE's content is only ever shown to
    the Super Admin through THIS endpoint — reached from an existing
    Report row — and every view is written to the immutable audit log.
    There is no other endpoint anywhere that lets a Super Admin browse a
    private conversation's content directly; discovering abuse requires a
    user to have reported it first, exactly as the platform's moderation
    policy (see Report's own docstring) intends. Public discussion/reply
    content needs no such gate (it's visible to the whole learning
    community already) but is still logged here for a complete audit
    trail."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise ValueError("No report with that id.")

    if report.target_type == "message":
        msg = db.query(Message).filter(Message.id == report.target_id).first()
        if not msg:
            raise ValueError("The reported message no longer exists.")
        content = "This message was deleted." if msg.deleted else msg.content
        author = msg.sender_id
        created_at = msg.created_at
    elif report.target_type == "discussion":
        d = db.query(Discussion).filter(Discussion.id == report.target_id).first()
        if not d:
            raise ValueError("The reported discussion no longer exists.")
        content = d.description
        author = d.author_id
        created_at = d.created_at
    elif report.target_type == "reply":
        reply = db.query(DiscussionReply).filter(DiscussionReply.id == report.target_id).first()
        if not reply:
            raise ValueError("The reported reply no longer exists.")
        content = "This reply was deleted." if reply.deleted else reply.content
        author = reply.author_id
        created_at = reply.created_at
    else:  # "user" — nothing to show beyond the report itself
        content = "(This report is against a user account, not a specific piece of content.)"
        author = report.target_id
        created_at = report.created_at

    author_user = db.query(User).filter(User.id == author).first()

    _write_audit_log(
        db, actor, "viewed_reported_content", author,
        f"Viewed {report.target_type} #{report.target_id} content for report #{report.id}.",
    )

    return {
        "target_type": report.target_type,
        "target_id": report.target_id,
        "author_username": author_user.username if author_user else "(deleted account)",
        "content": content,
        "created_at": created_at,
    }


def resolve_report(db: Session, actor: User, report_id: int, resolution: str, action: str | None, note: str | None) -> dict:
    if resolution not in ("reviewed", "dismissed"):
        raise ValueError("resolution must be 'reviewed' or 'dismissed'.")
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise ValueError("No report with that id.")

    report.status = resolution
    report.reviewed_by = actor.id
    report.reviewed_at = _utcnow()
    db.commit()

    detail = f"Report #{report.id} ({report.target_type} #{report.target_id}) marked {resolution}."
    if note:
        detail += f" Note: {note}"

    if action == "suspend_user":
        suspend_user_id = report.target_id if report.target_type == "user" else _author_of(db, report)
        if suspend_user_id:
            try:
                update_account_status(db, actor, suspend_user_id, "suspended", f"Moderation action on report #{report.id}.")
            except ValueError:
                pass  # e.g. target already a super_admin / already gone — the report is still resolved either way

    _write_audit_log(db, actor, "moderation_report_resolved", _author_of(db, report), detail)
    return {"id": report.id, "status": report.status, "message": f"Report marked {resolution}."}


def _author_of(db: Session, report: Report) -> int | None:
    if report.target_type == "message":
        msg = db.query(Message).filter(Message.id == report.target_id).first()
        return msg.sender_id if msg else None
    if report.target_type == "discussion":
        d = db.query(Discussion).filter(Discussion.id == report.target_id).first()
        return d.author_id if d else None
    if report.target_type == "reply":
        reply = db.query(DiscussionReply).filter(DiscussionReply.id == report.target_id).first()
        return reply.author_id if reply else None
    if report.target_type == "user":
        return report.target_id
    return None


# ---------------------------------------------------------------------------
# Settings (read-only — real constants, never duplicated)
# ---------------------------------------------------------------------------


def get_settings() -> dict:
    return {
        "pbkdf2_iterations": PBKDF2_ITERATIONS,
        "session_lifetime_hours": TOKEN_EXPIRES_SECONDS // 3600,
        "super_admin_session_lifetime_hours": SUPER_ADMIN_SESSION_LIFETIME_SECONDS / 3600,
        "login_rate_limit_max_attempts": LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
        "login_rate_limit_window_minutes": LOGIN_RATE_LIMIT_WINDOW_SECONDS // 60,
        "chat_rate_limit_max_actions": RATE_LIMIT_MAX_ACTIONS,
        "chat_rate_limit_window_seconds": RATE_LIMIT_WINDOW_SECONDS,
        "needs_attention_stale_days": NEEDS_ATTENTION_STALE_DAYS,
        "needs_attention_low_progress_pct": NEEDS_ATTENTION_LOW_PROGRESS_PCT,
        "quiz_pass_score": QUIZ_PASS_SCORE,
        "email_delivery_configured": email_is_configured(),
    }


# ---------------------------------------------------------------------------
# Platform-wide learning + community activity (for charts)
# ---------------------------------------------------------------------------


def get_learning_activity(db: Session) -> dict:
    window_start = _utcnow() - timedelta(days=LEARNING_ACTIVITY_WINDOW_DAYS)

    activity_rows = (
        db.query(ActivityLog.domain, ActivityLog.timestamp)
        .filter(ActivityLog.timestamp >= window_start)
        .all()
    )
    daily_activity: dict[str, dict[str, int]] = {}
    for domain, ts in activity_rows:
        day = ts.date().isoformat()
        bucket = daily_activity.setdefault(day, {"nlp": 0, "dl": 0})
        if domain in ("nlp", "dl"):
            bucket[domain] += 1

    discussion_rows = db.query(Discussion.created_at).filter(Discussion.created_at >= window_start).all()
    reply_rows = db.query(DiscussionReply.created_at).filter(DiscussionReply.created_at >= window_start).all()
    message_rows = db.query(Message.created_at).filter(Message.created_at >= window_start).all()

    daily_community: dict[str, dict[str, int]] = {}

    def _bump(rows, key):
        for (ts,) in rows:
            day = ts.date().isoformat()
            bucket = daily_community.setdefault(day, {"discussions": 0, "replies": 0, "messages": 0})
            bucket[key] += 1

    _bump(discussion_rows, "discussions")
    _bump(reply_rows, "replies")
    _bump(message_rows, "messages")

    all_days = sorted(set(daily_activity) | set(daily_community))
    daily_activity_out = [
        {"date": d, "nlp_count": daily_activity.get(d, {}).get("nlp", 0), "dl_count": daily_activity.get(d, {}).get("dl", 0)}
        for d in all_days
    ]
    daily_community_out = [
        {
            "date": d,
            "discussions": daily_community.get(d, {}).get("discussions", 0),
            "replies": daily_community.get(d, {}).get("replies", 0),
            "messages": daily_community.get(d, {}).get("messages", 0),
        }
        for d in all_days
    ]

    scores = [s for (s,) in db.query(QuizResult.score).all()]
    total_quiz_attempts = len(scores)
    passed = sum(1 for s in scores if s >= QUIZ_PASS_SCORE)
    quiz_pass_rate_pct = round((passed / total_quiz_attempts) * 100) if total_quiz_attempts else 0
    total_completed_labs = db.query(LearningProgress).filter(LearningProgress.status == "completed").count()

    return {
        "daily_activity": daily_activity_out,
        "daily_community": daily_community_out,
        "quiz_pass_rate_pct": quiz_pass_rate_pct,
        "total_quiz_attempts": total_quiz_attempts,
        "total_completed_labs": total_completed_labs,
    }
