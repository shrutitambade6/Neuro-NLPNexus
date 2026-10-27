from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_super_admin
from app.database import get_db
from app.models.orm_models import User
from app.schemas.superadmin import (
    AccountActionResponse,
    ActionMessageResponse,
    ApproveTeacherRequest,
    AuditLogResponse,
    CreateTeacherRequest,
    LearningActivityResponse,
    OverviewResponse,
    PasswordResetTriggerResponse,
    ReportContentOut,
    ReportListResponse,
    ResolveReportRequest,
    SecurityOverviewResponse,
    SettingsOut,
    StudentDetailOut,
    StudentListResponse,
    TeacherListResponse,
    TeacherRequestListResponse,
    TeacherSummaryOut,
    UpdateAccountStatusRequest,
)
from app.services import superadmin_service

router = APIRouter()


@router.get("/superadmin/overview", response_model=OverviewResponse)
def overview_endpoint(_admin: User = Depends(require_super_admin), db: Session = Depends(get_db)) -> OverviewResponse:
    return superadmin_service.get_overview(db)


@router.get("/superadmin/students", response_model=StudentListResponse)
def list_students_endpoint(
    search: str | None = Query(None, max_length=254),
    _admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> StudentListResponse:
    return superadmin_service.list_students(db, search=search)


@router.get("/superadmin/students/{student_id}", response_model=StudentDetailOut)
def student_detail_endpoint(
    student_id: int, _admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> StudentDetailOut:
    try:
        return superadmin_service.get_student_detail(db, student_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/superadmin/teachers", response_model=TeacherListResponse)
def list_teachers_endpoint(_admin: User = Depends(require_super_admin), db: Session = Depends(get_db)) -> TeacherListResponse:
    return superadmin_service.list_teachers(db)


@router.get("/superadmin/teachers/{teacher_id}", response_model=TeacherSummaryOut)
def teacher_detail_endpoint(
    teacher_id: int, _admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> TeacherSummaryOut:
    try:
        return superadmin_service.get_teacher_detail(db, teacher_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/superadmin/teachers", response_model=TeacherSummaryOut, status_code=201)
def create_teacher_endpoint(
    payload: CreateTeacherRequest, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> TeacherSummaryOut:
    try:
        return superadmin_service.create_teacher(
            db, admin, payload.username, payload.email, payload.password, payload.assigned_domain
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/superadmin/teacher-requests", response_model=TeacherRequestListResponse)
def list_teacher_requests_endpoint(
    _admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> TeacherRequestListResponse:
    return superadmin_service.list_teacher_requests(db)


@router.post("/superadmin/teacher-requests/{user_id}/approve", response_model=TeacherSummaryOut)
def approve_teacher_request_endpoint(
    user_id: int,
    payload: ApproveTeacherRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> TeacherSummaryOut:
    try:
        return superadmin_service.approve_teacher_request(db, admin, user_id, payload.assigned_domain)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/superadmin/teacher-requests/{user_id}/reject", response_model=ActionMessageResponse)
def reject_teacher_request_endpoint(
    user_id: int, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> ActionMessageResponse:
    try:
        return superadmin_service.reject_teacher_request(db, admin, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/superadmin/users/{user_id}/status", response_model=AccountActionResponse)
def update_status_endpoint(
    user_id: int,
    payload: UpdateAccountStatusRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> AccountActionResponse:
    try:
        return superadmin_service.update_account_status(db, admin, user_id, payload.status, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/superadmin/users/{user_id}/reset-password", response_model=PasswordResetTriggerResponse)
def reset_password_endpoint(
    user_id: int, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> PasswordResetTriggerResponse:
    try:
        return superadmin_service.trigger_password_reset(db, admin, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/superadmin/security/overview", response_model=SecurityOverviewResponse)
def security_overview_endpoint(
    _admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> SecurityOverviewResponse:
    return superadmin_service.get_security_overview(db)


@router.delete("/superadmin/security/sessions/{session_id}", response_model=ActionMessageResponse)
def revoke_session_endpoint(
    session_id: int, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> ActionMessageResponse:
    try:
        return superadmin_service.revoke_session(db, admin, session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/superadmin/audit-log", response_model=AuditLogResponse)
def audit_log_endpoint(
    action_type: str | None = Query(None, max_length=48),
    page: int = Query(1, ge=1),
    _admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> AuditLogResponse:
    return superadmin_service.list_audit_log(db, action_type=action_type, page=page)


@router.get("/superadmin/moderation/reports", response_model=ReportListResponse)
def list_reports_endpoint(
    status: str | None = Query(None, max_length=16),
    _admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> ReportListResponse:
    return superadmin_service.list_reports(db, status_filter=status)


@router.get("/superadmin/moderation/reports/{report_id}/content", response_model=ReportContentOut)
def report_content_endpoint(
    report_id: int, admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> ReportContentOut:
    try:
        return superadmin_service.get_report_content(db, admin, report_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/superadmin/moderation/reports/{report_id}/resolve", response_model=ActionMessageResponse)
def resolve_report_endpoint(
    report_id: int,
    payload: ResolveReportRequest,
    admin: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
) -> ActionMessageResponse:
    try:
        result = superadmin_service.resolve_report(db, admin, report_id, payload.resolution, payload.action, payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"id": result["id"], "message": result["message"]}


@router.get("/superadmin/settings", response_model=SettingsOut)
def settings_endpoint(_admin: User = Depends(require_super_admin)) -> SettingsOut:
    return superadmin_service.get_settings()


@router.get("/superadmin/learning-activity", response_model=LearningActivityResponse)
def learning_activity_endpoint(
    _admin: User = Depends(require_super_admin), db: Session = Depends(get_db)
) -> LearningActivityResponse:
    return superadmin_service.get_learning_activity(db)
