"""
Pydantic schemas for the Super Admin Portal (/api/superadmin/*). Nothing
here ever includes password_hash, a raw JWT, or any other secret — see
each *Out model below.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlatformOverviewOut(BaseModel):
    total_students: int
    total_teachers: int
    active_users: int  # logged in within the active window (see superadmin_service.ACTIVE_WINDOW_DAYS)
    online_now: int  # real-time, from the WebSocket ConnectionManager
    registered_this_week: int
    nlp_activity_count: int
    dl_activity_count: int
    completed_labs_count: int
    quiz_activity_count: int
    community_activity_count: int  # discussions + replies + messages
    open_reports_count: int


class RecentEventOut(BaseModel):
    kind: str  # "audit" | "login_failed" | "report_filed"
    summary: str
    created_at: datetime


class OverviewResponse(BaseModel):
    stats: PlatformOverviewOut
    recent_events: list[RecentEventOut]


class AccountSummaryOut(BaseModel):
    id: int
    username: str
    # Username/Password Authentication milestone (2026-10-07) — most
    # accounts now have no email at all (signup never collects one); see
    # orm_models.User.email's own comment. Still populated for an account
    # a Super Admin created directly via CreateTeacherRequest below.
    email: str | None = None
    # Username/Password Authentication milestone (2026-10-07) — the
    # display identity rosters should prefer now that email is usually
    # absent. Also nullable: pre-existing accounts from before this column
    # existed have none on file either.
    full_name: str | None = None
    role: str
    account_status: str
    created_at: datetime
    last_login: datetime | None
    is_online: bool

    model_config = ConfigDict(from_attributes=True)


class StudentSummaryOut(AccountSummaryOut):
    nlp_progress_pct: int
    dl_progress_pct: int
    completed_labs_count: int
    quiz_attempts_count: int


class StudentListResponse(BaseModel):
    students: list[StudentSummaryOut]
    total: int


class StudentDetailOut(StudentSummaryOut):
    is_verified: bool


class TeacherSummaryOut(AccountSummaryOut):
    assigned_domain: str | None
    is_verified: bool


class TeacherListResponse(BaseModel):
    teachers: list[TeacherSummaryOut]


class TeacherRequestOut(AccountSummaryOut):
    pass


class TeacherRequestListResponse(BaseModel):
    requests: list[TeacherRequestOut]


class ApproveTeacherRequest(BaseModel):
    assigned_domain: str | None = Field(None, max_length=8)  # "nlp" | "dl" | None


class CreateTeacherRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    # Deliberately left required here, unlike the public /auth/register
    # flow (Username/Password Authentication milestone, 2026-10-07) --
    # this is the Super Admin's own internal "create a teacher directly"
    # tool, a separate flow the pasted spec didn't describe, and keeping
    # an email on file for an admin-created account is still useful for
    # the Super Admin's own records. It is still never required for that
    # teacher to log in afterward -- every account, however created, logs
    # in with username + password.
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    assigned_domain: str | None = Field(None, max_length=8)  # "nlp" | "dl" | None


class UpdateAccountStatusRequest(BaseModel):
    status: str = Field(..., max_length=16)  # "active" | "suspended" | "deactivated"
    reason: str = Field(..., min_length=3, max_length=300)


class AccountActionResponse(BaseModel):
    id: int
    account_status: str
    message: str


class ActionMessageResponse(BaseModel):
    id: int
    message: str


class PasswordResetTriggerResponse(BaseModel):
    message: str
    email_status: str
    # Username/Password Authentication milestone (2026-10-07) — populated
    # only when the target account has no email on file, in which case
    # there is no self-service reset link to send at all, so
    # superadmin_service.trigger_password_reset generates a real new
    # password directly instead (see that function's own comment). None
    # whenever the existing email-reset flow ran instead.
    temporary_password: str | None = None


class AuditLogEntryOut(BaseModel):
    id: int
    actor_username: str
    action_type: str
    target_username: str | None
    details: str | None
    created_at: datetime


class AuditLogResponse(BaseModel):
    entries: list[AuditLogEntryOut]
    total: int


class LoginActivityOut(BaseModel):
    id: int
    email_attempted: str
    success: bool
    failure_reason: str | None
    ip_address: str | None
    created_at: datetime


class SuspiciousActivityOut(BaseModel):
    email_attempted: str
    failed_count: int
    window_minutes: int


class SessionOut(BaseModel):
    id: int
    user_id: int
    username: str
    ip_address: str | None
    user_agent: str | None
    created_at: datetime
    expires_at: datetime


class SecurityOverviewResponse(BaseModel):
    login_activity: list[LoginActivityOut]
    failed_login_count_24h: int
    suspicious: list[SuspiciousActivityOut]
    active_sessions: list[SessionOut]


class ReportOut(BaseModel):
    id: int
    reporter_username: str
    target_type: str
    target_id: int
    reason: str
    status: str
    created_at: datetime
    reviewed_by_username: str | None
    reviewed_at: datetime | None


class ReportListResponse(BaseModel):
    reports: list[ReportOut]


class ReportContentOut(BaseModel):
    target_type: str
    target_id: int
    author_username: str
    content: str
    created_at: datetime


class ResolveReportRequest(BaseModel):
    resolution: str = Field(..., max_length=16)  # "reviewed" | "dismissed"
    action: str | None = Field(None, max_length=16)  # None | "suspend_user"
    note: str | None = Field(None, max_length=300)


class SettingsOut(BaseModel):
    # Real values read live from the modules that actually enforce them —
    # never duplicated/hardcoded here. See superadmin_service.get_settings.
    pbkdf2_iterations: int
    session_lifetime_hours: int
    super_admin_session_lifetime_hours: float
    login_rate_limit_max_attempts: int
    login_rate_limit_window_minutes: int
    chat_rate_limit_max_actions: int
    chat_rate_limit_window_seconds: int
    needs_attention_stale_days: int
    needs_attention_low_progress_pct: int
    quiz_pass_score: int
    email_delivery_configured: bool


class LearningActivityPointOut(BaseModel):
    date: str  # ISO date (YYYY-MM-DD)
    nlp_count: int
    dl_count: int


class CommunityActivityPointOut(BaseModel):
    date: str
    discussions: int
    replies: int
    messages: int


class LearningActivityResponse(BaseModel):
    daily_activity: list[LearningActivityPointOut]
    daily_community: list[CommunityActivityPointOut]
    quiz_pass_rate_pct: int
    total_quiz_attempts: int
    total_completed_labs: int
