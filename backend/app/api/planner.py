"""
Study Planner API (2026-10-07) -- Day/Dashboard, Week, and Month screens.
Every route requires a real signed-in user (require_user) and every
service call is scoped to that user's own rows; there is no planner data
visible across accounts anywhere in this router.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.database import get_db
from app.models.orm_models import User
from app.schemas.planner import (
    CategoryCreate,
    CategoryOut,
    DayOverviewOut,
    HabitCreate,
    HabitOut,
    MonthOverviewOut,
    RescheduleRequest,
    SettingsOut,
    SettingsUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
    WeekOverviewOut,
)
from app.services import planner_service

router = APIRouter()


@router.get("/planner/categories", response_model=list[CategoryOut])
def list_categories_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[CategoryOut]:
    return planner_service.list_categories(db, user)


@router.post("/planner/categories", response_model=CategoryOut, status_code=201)
def create_category_endpoint(
    payload: CategoryCreate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> CategoryOut:
    return planner_service.create_category(db, user, payload)


@router.delete("/planner/categories/{category_id}", status_code=204)
def delete_category_endpoint(category_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> None:
    try:
        planner_service.delete_category(db, user, category_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/planner/tasks", response_model=list[TaskOut])
def list_tasks_endpoint(
    start: date = Query(...),
    end: date = Query(...),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[TaskOut]:
    if end < start:
        raise HTTPException(status_code=400, detail="end must not be before start.")
    return planner_service.list_tasks_range(db, user, start, end)


@router.post("/planner/tasks", response_model=TaskOut, status_code=201)
def create_task_endpoint(payload: TaskCreate, user: User = Depends(require_user), db: Session = Depends(get_db)) -> TaskOut:
    try:
        return planner_service.create_task(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/planner/tasks/{task_id}", response_model=TaskOut)
def update_task_endpoint(
    task_id: int, payload: TaskUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> TaskOut:
    try:
        return planner_service.update_task(db, user, task_id, payload)
    except ValueError as exc:
        status = 404 if "No task" in str(exc) else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@router.post("/planner/tasks/{task_id}/reschedule", response_model=TaskOut)
def reschedule_task_endpoint(
    task_id: int, payload: RescheduleRequest, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> TaskOut:
    try:
        return planner_service.reschedule_task(db, user, task_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/planner/tasks/{task_id}", status_code=204)
def delete_task_endpoint(task_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> None:
    try:
        planner_service.delete_task(db, user, task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/planner/habits", response_model=list[HabitOut])
def list_habits_endpoint(user: User = Depends(require_user), db: Session = Depends(get_db)) -> list[HabitOut]:
    return planner_service.list_habits(db, user)


@router.post("/planner/habits", response_model=HabitOut, status_code=201)
def create_habit_endpoint(payload: HabitCreate, user: User = Depends(require_user), db: Session = Depends(get_db)) -> HabitOut:
    return planner_service.create_habit(db, user, payload.name)


@router.delete("/planner/habits/{habit_id}", status_code=204)
def delete_habit_endpoint(habit_id: int, user: User = Depends(require_user), db: Session = Depends(get_db)) -> None:
    try:
        planner_service.delete_habit(db, user, habit_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/planner/habits/{habit_id}/check")
def toggle_habit_check_endpoint(
    habit_id: int,
    for_date: date = Query(..., alias="date"),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        checked = planner_service.toggle_habit_check(db, user, habit_id, for_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"checked": checked}


@router.get("/planner/settings", response_model=SettingsOut)
def get_settings_endpoint(user: User = Depends(require_user)) -> SettingsOut:
    return planner_service.get_settings(user)


@router.patch("/planner/settings", response_model=SettingsOut)
def update_settings_endpoint(
    payload: SettingsUpdate, user: User = Depends(require_user), db: Session = Depends(get_db)
) -> SettingsOut:
    return planner_service.update_settings(db, user, payload)


@router.get("/planner/overview/day", response_model=DayOverviewOut)
def day_overview_endpoint(
    for_date: date = Query(..., alias="date"), user: User = Depends(require_user), db: Session = Depends(get_db)
) -> DayOverviewOut:
    return planner_service.compute_day_overview(db, user, for_date)


@router.get("/planner/overview/week", response_model=WeekOverviewOut)
def week_overview_endpoint(
    start: date = Query(...), user: User = Depends(require_user), db: Session = Depends(get_db)
) -> WeekOverviewOut:
    return planner_service.compute_week_overview(db, user, start)


@router.get("/planner/overview/month", response_model=MonthOverviewOut)
def month_overview_endpoint(
    year: int = Query(..., ge=1970, le=3000),
    month: int = Query(..., ge=1, le=12),
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> MonthOverviewOut:
    return planner_service.compute_month_overview(db, user, year, month)
