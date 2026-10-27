from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.database import get_db
from app.models.orm_models import User
from app.schemas.admin import (
    AdminOverviewResponse,
    AssessmentsResponse,
    DomainAnalyticsResponse,
    HeatmapResponse,
    NeedsAttentionResponse,
    StudentDetailResponse,
    StudentListResponse,
)
from app.services.admin_service import (
    get_admin_overview,
    get_assessments,
    get_domain_analytics,
    get_heatmap,
    get_needs_attention,
    get_student_detail,
    list_students,
)

router = APIRouter()


@router.get("/admin/overview", response_model=AdminOverviewResponse)
def admin_overview_endpoint(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminOverviewResponse:
    return get_admin_overview(db)


@router.get("/admin/students", response_model=StudentListResponse)
def admin_students_endpoint(
    search: str | None = Query(None, max_length=254),
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StudentListResponse:
    return list_students(db, search=search)


@router.get("/admin/students/{student_id}", response_model=StudentDetailResponse)
def admin_student_detail_endpoint(
    student_id: int,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StudentDetailResponse:
    try:
        return get_student_detail(db, student_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/admin/analytics/{domain}", response_model=DomainAnalyticsResponse)
def admin_domain_analytics_endpoint(
    domain: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DomainAnalyticsResponse:
    try:
        return get_domain_analytics(db, domain)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/admin/assessments", response_model=AssessmentsResponse)
def admin_assessments_endpoint(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssessmentsResponse:
    return get_assessments(db)


@router.get("/admin/needs-attention", response_model=NeedsAttentionResponse)
def admin_needs_attention_endpoint(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> NeedsAttentionResponse:
    return get_needs_attention(db)


@router.get("/admin/heatmap/{domain}", response_model=HeatmapResponse)
def admin_heatmap_endpoint(
    domain: str,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> HeatmapResponse:
    try:
        return get_heatmap(db, domain)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
