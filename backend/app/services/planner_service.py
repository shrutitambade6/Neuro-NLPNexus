"""
Business logic for the Study Planner milestone (2026-10-07) -- Day/
Dashboard, Week, and Month screens, built additively on top of the
existing NLP/DL learning platform (new tables only, see orm_models.py;
no existing model, route, or service in this codebase was changed to add
this). Every function here assumes the caller has already authenticated
the user (require_user) and scopes every query to that user's own id --
there is no cross-user planner data anywhere in this file.

Dates (`due_date`, `start_minute`) are naive local-wall-clock values,
deliberately never UTC-converted for storage or comparison -- the same
"never blind UTC" lesson this project already paid for once with the
Birthday Experience's date-input bugs (see
teacher-dashboard-and-community-chat-milestones.md). Only focus-session
timestamps (`PlannerTaskSession.started_at`/`ended_at`) are real UTC
instants, since elapsed wall-clock duration genuinely needs one, and
those are clipped back into a LOCAL day's bounds using the user's own
`timezone` column (reusing the column the Birthday Experience already
added to User, not a new one).
"""
from __future__ import annotations

import calendar
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from app.models.orm_models import (
    PlannerCategory,
    PlannerHabit,
    PlannerHabitCheck,
    PlannerTask,
    PlannerTaskSession,
    User,
)
from app.schemas.planner import (
    CATEGORY_COLORS,
    PRIORITIES,
    STATUSES,
    CategoryCreate,
    RescheduleRequest,
    SettingsUpdate,
    TaskCreate,
    TaskUpdate,
)

DEFAULT_TIMEZONE = "UTC"
DEFAULT_TASK_DURATION_MINUTES = 60
FOCUS_CHART_START_HOUR = 6
FOCUS_CHART_END_HOUR = 22  # exclusive upper bound -> last bucket is hour 21 (10 PM)
FOCUS_DAILY_CAP_MINUTES = 8 * 60


def _utcnow() -> datetime:
    return datetime.now(dt_timezone.utc)


def _as_aware_utc(dt: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip even for a column written with a
    tz-aware `utcnow()` value (confirmed empirically against a real copy
    of this project's own db) -- every DateTime column in this codebase
    already relies on "naive-but-really-UTC" for that reason (see
    PlannerTaskSession.started_at's own comment). SQL-level comparisons
    against a tz-aware Python value still work (SQLAlchemy/SQLite compare
    the ISO text), but Python-level arithmetic on the loaded value does
    not -- this is what re-attaches UTC before any max()/min()/subtraction
    below."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=dt_timezone.utc)


def _safe_zone(tz_name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except Exception:
        # An unrecognized/garbled zone name should never break the
        # planner -- same fallback-to-UTC convention birthday_service
        # already established for the same column.
        return ZoneInfo(DEFAULT_TIMEZONE)


def local_today(user: User) -> date:
    return datetime.now(_safe_zone(user.timezone)).date()


def _local_now_minute(user: User) -> int:
    now = datetime.now(_safe_zone(user.timezone))
    return now.hour * 60 + now.minute


def _local_day_bounds_utc(user: User, day: date) -> tuple[datetime, datetime]:
    """[start, end) of `day` in the user's own timezone, as real UTC
    instants -- what PlannerTaskSession rows are clipped against."""
    zone = _safe_zone(user.timezone)
    start_local = datetime.combine(day, time.min, tzinfo=zone)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(dt_timezone.utc), end_local.astimezone(dt_timezone.utc)


def _fmt_day(d: date) -> str:
    return f"{d.strftime('%b')} {d.day}"


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


def list_categories(db: Session, user: User) -> list[PlannerCategory]:
    return db.query(PlannerCategory).filter(PlannerCategory.user_id == user.id).order_by(PlannerCategory.created_at.asc()).all()


def create_category(db: Session, user: User, payload: CategoryCreate) -> PlannerCategory:
    category = PlannerCategory(user_id=user.id, name=payload.name.strip(), color=payload.color)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, user: User, category_id: int) -> None:
    category = db.query(PlannerCategory).filter(PlannerCategory.id == category_id, PlannerCategory.user_id == user.id).first()
    if not category:
        raise ValueError("No category with that id.")
    # Null out, never cascade-delete the tasks themselves -- removing a
    # category is tidying up a label, not a reason to lose someone's
    # tasks.
    db.query(PlannerTask).filter(PlannerTask.category_id == category.id, PlannerTask.user_id == user.id).update(
        {"category_id": None}
    )
    db.delete(category)
    db.commit()


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------


def _task_query(db: Session, user: User):
    return db.query(PlannerTask).options(joinedload(PlannerTask.category)).filter(PlannerTask.user_id == user.id)


def get_task(db: Session, user: User, task_id: int) -> PlannerTask:
    task = _task_query(db, user).filter(PlannerTask.id == task_id).first()
    if not task:
        raise ValueError("No task with that id.")
    return task


def create_task(db: Session, user: User, payload: TaskCreate) -> PlannerTask:
    if payload.category_id is not None:
        owned = (
            db.query(PlannerCategory)
            .filter(PlannerCategory.id == payload.category_id, PlannerCategory.user_id == user.id)
            .first()
        )
        if not owned:
            raise ValueError("No category with that id.")
    duration = payload.duration_minutes
    if payload.start_minute is not None and duration is None:
        # Matches the Week grid's own quick-add behavior (clicking a
        # half-hour slot defaults to a 60-minute block) -- applied here
        # too so any OTHER caller of this same endpoint gets the same
        # sane default rather than a 422 for an easily-inferred value.
        duration = DEFAULT_TASK_DURATION_MINUTES
    task = PlannerTask(
        user_id=user.id,
        title=payload.title.strip(),
        description=payload.description,
        category_id=payload.category_id,
        priority=payload.priority,
        status="todo",
        due_date=payload.due_date,
        start_minute=payload.start_minute,
        duration_minutes=duration,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _apply_status_change(db: Session, user: User, task: PlannerTask, new_status: str) -> None:
    if new_status == task.status:
        return
    if new_status not in STATUSES:
        raise ValueError(f"status must be one of {STATUSES}")

    # Close any currently-open focus session the moment the task leaves
    # "working", regardless of which status it's moving TO -- a task can
    # only ever have one open session at a time.
    if task.status == "working" and new_status != "working":
        open_session = (
            db.query(PlannerTaskSession)
            .filter(PlannerTaskSession.task_id == task.id, PlannerTaskSession.ended_at.is_(None))
            .first()
        )
        if open_session:
            open_session.ended_at = _utcnow()

    # Open a fresh session the moment it ENTERS "working".
    if new_status == "working" and task.status != "working":
        db.add(PlannerTaskSession(task_id=task.id, user_id=user.id, started_at=_utcnow()))

    task.completed_at = _utcnow() if new_status == "done" else None
    task.status = new_status


def update_task(db: Session, user: User, task_id: int, payload: TaskUpdate) -> PlannerTask:
    task = get_task(db, user, task_id)

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.description is not None:
        task.description = payload.description
    if payload.clear_category:
        task.category_id = None
    elif payload.category_id is not None:
        owned = (
            db.query(PlannerCategory)
            .filter(PlannerCategory.id == payload.category_id, PlannerCategory.user_id == user.id)
            .first()
        )
        if not owned:
            raise ValueError("No category with that id.")
        task.category_id = payload.category_id
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.clear_start:
        task.start_minute = None
        task.duration_minutes = None
    elif payload.start_minute is not None:
        task.start_minute = payload.start_minute
        task.duration_minutes = payload.duration_minutes or task.duration_minutes or DEFAULT_TASK_DURATION_MINUTES
    elif payload.duration_minutes is not None:
        task.duration_minutes = payload.duration_minutes

    if payload.status is not None:
        _apply_status_change(db, user, task, payload.status)

    db.commit()
    db.refresh(task)
    return task


def reschedule_task(db: Session, user: User, task_id: int, payload: RescheduleRequest) -> PlannerTask:
    """The Week grid's drag-to-reschedule -- deliberately narrower than
    update_task above (only due_date/start_minute move), so a drag can
    never accidentally touch title/priority/status/etc. Duration is
    preserved exactly -- dragging moves a block, it doesn't resize it."""
    task = get_task(db, user, task_id)
    task.due_date = payload.due_date
    task.start_minute = payload.start_minute
    if task.duration_minutes is None:
        task.duration_minutes = DEFAULT_TASK_DURATION_MINUTES
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, user: User, task_id: int) -> None:
    task = get_task(db, user, task_id)
    db.query(PlannerTaskSession).filter(PlannerTaskSession.task_id == task.id).delete()
    db.delete(task)
    db.commit()


def list_tasks_range(db: Session, user: User, start: date, end_inclusive: date) -> list[PlannerTask]:
    return (
        _task_query(db, user)
        .filter(PlannerTask.due_date >= start, PlannerTask.due_date <= end_inclusive)
        .order_by(PlannerTask.due_date.asc(), PlannerTask.start_minute.asc().nulls_first())
        .all()
    )


# ---------------------------------------------------------------------------
# Habits
# ---------------------------------------------------------------------------


def list_habits(db: Session, user: User) -> list[PlannerHabit]:
    return (
        db.query(PlannerHabit)
        .filter(PlannerHabit.user_id == user.id, PlannerHabit.archived.is_(False))
        .order_by(PlannerHabit.created_at.asc())
        .all()
    )


def create_habit(db: Session, user: User, name: str) -> PlannerHabit:
    habit = PlannerHabit(user_id=user.id, name=name.strip())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def delete_habit(db: Session, user: User, habit_id: int) -> None:
    habit = db.query(PlannerHabit).filter(PlannerHabit.id == habit_id, PlannerHabit.user_id == user.id).first()
    if not habit:
        raise ValueError("No habit with that id.")
    db.query(PlannerHabitCheck).filter(PlannerHabitCheck.habit_id == habit.id).delete()
    db.delete(habit)
    db.commit()


def toggle_habit_check(db: Session, user: User, habit_id: int, day: date) -> bool:
    """Returns the new checked state (True = just checked, False = just
    unchecked) -- a plain toggle, since the spec's check circle has no
    separate "undo" affordance."""
    habit = db.query(PlannerHabit).filter(PlannerHabit.id == habit_id, PlannerHabit.user_id == user.id).first()
    if not habit:
        raise ValueError("No habit with that id.")
    existing = (
        db.query(PlannerHabitCheck)
        .filter(PlannerHabitCheck.habit_id == habit.id, PlannerHabitCheck.date == day)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return False
    db.add(PlannerHabitCheck(habit_id=habit.id, user_id=user.id, date=day))
    db.commit()
    return True


def _habit_streak(checked_dates: set[date], day: date) -> int:
    # "Consecutive days ending `day`, or `day - 1` if `day` isn't ticked
    # yet" -- generalizes the spec's "ending today, or yesterday" rule to
    # whatever date the Dashboard is currently viewing, so a streak reads
    # sensibly when browsing a past day too, not just on today itself.
    anchor = day if day in checked_dates else day - timedelta(days=1)
    streak = 0
    cursor = anchor
    while cursor in checked_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _habits_with_status(db: Session, user: User, day: date) -> list[dict]:
    habits = list_habits(db, user)
    if not habits:
        return []
    habit_ids = [h.id for h in habits]
    window_start = day - timedelta(days=180)  # plenty for any realistic streak, keeps the query bounded
    checks = (
        db.query(PlannerHabitCheck)
        .filter(PlannerHabitCheck.habit_id.in_(habit_ids), PlannerHabitCheck.date >= window_start, PlannerHabitCheck.date <= day)
        .all()
    )
    by_habit: dict[int, set[date]] = defaultdict(set)
    for c in checks:
        by_habit[c.habit_id].add(c.date)

    out = []
    for h in habits:
        checked_dates = by_habit.get(h.id, set())
        week = [(day - timedelta(days=offset)) in checked_dates for offset in range(6, -1, -1)]
        out.append(
            {
                "id": h.id,
                "name": h.name,
                "checked_today": day in checked_dates,
                "week": week,
                "streak": _habit_streak(checked_dates, day),
            }
        )
    return out


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


def get_settings(user: User) -> dict:
    return {"week_start": user.planner_week_start, "heatmap_measure": user.planner_heatmap_measure}


def update_settings(db: Session, user: User, payload: SettingsUpdate) -> dict:
    if payload.week_start is not None:
        user.planner_week_start = payload.week_start
    if payload.heatmap_measure is not None:
        user.planner_heatmap_measure = payload.heatmap_measure
    db.commit()
    return get_settings(user)


# ---------------------------------------------------------------------------
# Day / Dashboard overview
# ---------------------------------------------------------------------------


def _compute_focus(db: Session, user: User, day: date) -> dict:
    start_utc, end_utc = _local_day_bounds_utc(user, day)
    now = _utcnow()
    # Overlap with the day window regardless of which task the session
    # belongs to or that task's CURRENT due_date -- focus time is about
    # when the work actually happened, not where the task is scheduled
    # today.
    sessions = (
        db.query(PlannerTaskSession)
        .filter(PlannerTaskSession.user_id == user.id)
        .filter(PlannerTaskSession.started_at < end_utc)
        .filter((PlannerTaskSession.ended_at.is_(None)) | (PlannerTaskSession.ended_at > start_utc))
        .all()
    )
    zone = _safe_zone(user.timezone)
    by_hour_minutes: dict[int, float] = defaultdict(float)
    total = 0.0
    for s in sessions:
        session_start = _as_aware_utc(s.started_at)
        session_end = _as_aware_utc(s.ended_at) if s.ended_at else now
        seg_start = max(session_start, start_utc)
        seg_end = min(session_end, end_utc, now)
        if seg_end <= seg_start:
            continue
        cursor = seg_start
        while cursor < seg_end:
            local_cursor = cursor.astimezone(zone)
            next_hour_local = local_cursor.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            next_hour_utc = next_hour_local.astimezone(dt_timezone.utc)
            chunk_end = min(seg_end, next_hour_utc)
            minutes = (chunk_end - cursor).total_seconds() / 60
            by_hour_minutes[local_cursor.hour] += minutes
            total += minutes
            cursor = chunk_end

    total_minutes = min(round(total), FOCUS_DAILY_CAP_MINUTES)
    hours_with_data = [h for h, m in by_hour_minutes.items() if m > 0.5]
    lo = min([FOCUS_CHART_START_HOUR] + hours_with_data)
    hi = max([FOCUS_CHART_END_HOUR - 1] + hours_with_data)
    by_hour = [{"hour": h, "minutes": round(by_hour_minutes.get(h, 0.0))} for h in range(lo, hi + 1)]
    peak_hour = max(by_hour_minutes, key=lambda h: by_hour_minutes[h]) if by_hour_minutes else None

    local_now = datetime.now(zone)
    current_hour = local_now.hour if day == local_today(user) else -1
    return {"total_minutes": total_minutes, "by_hour": by_hour, "peak_hour": peak_hour, "current_hour": current_hour}


def _completion_pct(tasks: list[PlannerTask]) -> float:
    if not tasks:
        return 0.0
    done = sum(1 for t in tasks if t.status == "done")
    return round(done / len(tasks) * 100, 1)


def _seven_day_avg_completion(db: Session, user: User, day: date) -> float | None:
    """Average completion % over the 7 days immediately before `day`,
    counting only days that actually had at least one task due -- an
    empty day shouldn't drag the average toward 0 or 100."""
    window_start = day - timedelta(days=7)
    window_end = day - timedelta(days=1)
    tasks = (
        db.query(PlannerTask)
        .filter(PlannerTask.user_id == user.id, PlannerTask.due_date >= window_start, PlannerTask.due_date <= window_end)
        .all()
    )
    by_day: dict[date, list[PlannerTask]] = defaultdict(list)
    for t in tasks:
        by_day[t.due_date].append(t)
    if not by_day:
        return None
    pcts = [_completion_pct(day_tasks) for day_tasks in by_day.values()]
    return round(sum(pcts) / len(pcts), 1)


def _build_insights(
    *,
    day: date,
    is_today: bool,
    tasks_day: list[PlannerTask],
    overdue: list[PlannerTask],
    completion_pct: float,
    avg_7day: float | None,
    focus: dict,
    categories: list[dict],
    priority_split: list[dict],
) -> list[str]:
    candidates: list[str] = []

    if overdue:
        first = overdue[0]
        days_ago = (day - first.due_date).days
        age = "yesterday" if days_ago == 1 else f"{days_ago} days ago"
        rest = len(overdue) - 1
        extra = f", plus {rest} more unfinished task{'s' if rest != 1 else ''}." if rest > 0 else "."
        candidates.append(f'Overdue: "{first.title}" was due {age}{extra}')

    if tasks_day and avg_7day is not None:
        delta = completion_pct - avg_7day
        if delta >= 10:
            candidates.append(
                f"You're ahead of your usual pace — {completion_pct:.0f}% done today vs a {avg_7day:.0f}% 7-day average."
            )
        elif delta <= -10:
            tail = " Your 7-day average is 95%, so there's still time to catch up." if is_today and avg_7day >= 90 else ""
            candidates.append(
                f"You're behind your usual pace — {completion_pct:.0f}% done vs a {avg_7day:.0f}% 7-day average.{tail}"
            )
        else:
            candidates.append(f"Right in line with your 7-day average of {avg_7day:.0f}% completed.")

    if focus["by_hour"]:
        windows = []
        hours = [b["hour"] for b in focus["by_hour"]]
        minutes = {b["hour"]: b["minutes"] for b in focus["by_hour"]}
        for h in range(min(hours), max(hours) - 1):
            total3 = minutes.get(h, 0) + minutes.get(h + 1, 0) + minutes.get(h + 2, 0)
            windows.append((total3, h))
        if windows and focus["total_minutes"] > 0:
            best_total, best_start = max(windows)
            if best_total >= 0.4 * focus["total_minutes"]:
                def label(h: int) -> str:
                    hh = h % 24
                    suffix = "AM" if hh < 12 else "PM"
                    display = hh % 12 or 12
                    return f"{display} {suffix}"

                candidates.append(f"Most of your focus time was between {label(best_start)} and {label(best_start + 3)}.")

    high_tasks = [t for t in tasks_day if t.priority == "high"]
    if high_tasks:
        pending_high = [t for t in high_tasks if t.status != "done"]
        if pending_high:
            n = len(pending_high)
            candidates.append(f"{n} high-priority task{'s are' if n != 1 else ' is'} still pending.")
        else:
            n = len(high_tasks)
            candidates.append(f"All {n} high-priority task{'s are' if n != 1 else ' is'} done.")

    if categories:
        top = max(categories, key=lambda c: c["minutes"])
        if top["minutes"] > 0:
            candidates.append(f'{top["name"]} took up {top["pct"]:.0f}% of your planned day.')

    if not tasks_day and not overdue:
        candidates.append("Nothing is planned for today. A clean slate: press ⌘K to add a task.")

    return candidates[:4]


def compute_day_overview(db: Session, user: User, day: date) -> dict:
    today = local_today(user)
    is_today = day == today

    tasks_day = (
        _task_query(db, user)
        .filter(PlannerTask.due_date == day)
        .order_by(PlannerTask.start_minute.asc().nulls_last())
        .all()
    )

    overdue: list[PlannerTask] = []
    if is_today:
        overdue = (
            _task_query(db, user)
            .filter(PlannerTask.due_date < day, PlannerTask.status != "done")
            .order_by(PlannerTask.due_date.asc())
            .all()
        )

    total = len(tasks_day)
    done = sum(1 for t in tasks_day if t.status == "done")
    working = sum(1 for t in tasks_day if t.status == "working")
    todo = sum(1 for t in tasks_day if t.status == "todo")
    stats = {
        "my_tasks": total,
        "completed": done,
        "working": working,
        "todo": todo,
        "completed_pct": round(done / total * 100, 1) if total else 0.0,
    }

    now_minute = _local_now_minute(user)
    schedule = []
    for t in tasks_day:
        if t.start_minute is None:
            continue
        is_now = is_today and t.start_minute <= now_minute < (t.start_minute + (t.duration_minutes or 0))
        schedule.append(
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "start_minute": t.start_minute,
                "duration_minutes": t.duration_minutes or 0,
                "category": t.category,
                "is_now": is_now,
            }
        )

    week_from = day + timedelta(days=7)
    tasks_upcoming = (
        _task_query(db, user)
        .filter(PlannerTask.due_date > day, PlannerTask.due_date <= week_from, PlannerTask.status != "done")
        .order_by(PlannerTask.due_date.asc(), PlannerTask.start_minute.asc().nulls_last())
        .all()
    )
    tasks_all = (
        _task_query(db, user)
        .filter((PlannerTask.status != "done") | (PlannerTask.due_date == day))
        .order_by(PlannerTask.due_date.asc(), PlannerTask.start_minute.asc().nulls_last())
        .all()
    )

    productivity = {
        "done": done,
        "working": working,
        "todo": todo,
        "done_pct": round(done / total * 100, 1) if total else 0.0,
        "working_pct": round(working / total * 100, 1) if total else 0.0,
        "todo_pct": round(todo / total * 100, 1) if total else 0.0,
    }

    focus = _compute_focus(db, user, day)

    cat_minutes: dict[int | None, float] = defaultdict(float)
    cat_counts: dict[int | None, int] = defaultdict(int)
    cat_lookup: dict[int | None, PlannerCategory | None] = {None: None}
    for t in tasks_day:
        key = t.category_id
        cat_counts[key] += 1
        cat_lookup[key] = t.category
        if t.start_minute is not None and t.duration_minutes:
            cat_minutes[key] += t.duration_minutes
    total_planned_minutes = sum(cat_minutes.values())
    categories = []
    for key, count in cat_counts.items():
        cat = cat_lookup.get(key)
        minutes = cat_minutes.get(key, 0.0)
        categories.append(
            {
                "name": cat.name if cat else "Uncategorized",
                "color": cat.color if cat else "slate",
                "minutes": round(minutes),
                "task_count": count,
                "pct": round(minutes / total_planned_minutes * 100, 1) if total_planned_minutes else 0.0,
            }
        )
    categories.sort(key=lambda c: c["minutes"], reverse=True)

    priority_split = []
    for p in PRIORITIES:
        p_tasks = [t for t in tasks_day if t.priority == p]
        priority_split.append(
            {
                "priority": p,
                "done": sum(1 for t in p_tasks if t.status == "done"),
                "pending": sum(1 for t in p_tasks if t.status != "done"),
            }
        )

    completion_pct = stats["completed_pct"]
    avg_7day = _seven_day_avg_completion(db, user, day)
    insights = _build_insights(
        day=day,
        is_today=is_today,
        tasks_day=tasks_day,
        overdue=overdue,
        completion_pct=completion_pct,
        avg_7day=avg_7day,
        focus=focus,
        categories=categories,
        priority_split=priority_split,
    )

    return {
        "date": day,
        "stats": stats,
        "overdue": overdue,
        "schedule": schedule,
        "tasks_today": tasks_day,
        "tasks_upcoming": tasks_upcoming,
        "tasks_all": tasks_all,
        "productivity": productivity,
        "focus": focus,
        "categories": categories,
        "priority_split": priority_split,
        "insights": insights,
        "habits": _habits_with_status(db, user, day),
    }


# ---------------------------------------------------------------------------
# Week overview
# ---------------------------------------------------------------------------


def compute_week_overview(db: Session, user: User, week_start: date) -> dict:
    days_dates = [week_start + timedelta(days=i) for i in range(7)]
    tasks = list_tasks_range(db, user, days_dates[0], days_dates[-1])
    by_day: dict[date, list[PlannerTask]] = defaultdict(list)
    for t in tasks:
        by_day[t.due_date].append(t)

    today = local_today(user)
    days = []
    chart = []
    for d in days_dates:
        day_tasks = by_day.get(d, [])
        no_time = [t for t in day_tasks if t.start_minute is None]
        timed = sorted((t for t in day_tasks if t.start_minute is not None), key=lambda t: t.start_minute)
        days.append({"date": d, "label": d.strftime("%a"), "is_today": d == today, "no_time_tasks": no_time, "timed_tasks": timed})
        planned = sum(t.duration_minutes or 0 for t in timed) / 60
        completed = sum(t.duration_minutes or 0 for t in timed if t.status == "done") / 60
        chart.append({"label": d.strftime("%a"), "planned_hours": round(planned, 1), "completed_hours": round(completed, 1)})

    total = len(tasks)
    completed_count = sum(1 for t in tasks if t.status == "done")
    if by_day:
        busiest_date = max(by_day, key=lambda d: len(by_day[d]))
        busiest_tasks = by_day[busiest_date]
        busiest_label = busiest_date.strftime("%A")
        busiest_count = len(busiest_tasks)
        busiest_hours = round(sum(t.duration_minutes or 0 for t in busiest_tasks if t.start_minute is not None) / 60, 1)
    else:
        busiest_label, busiest_count, busiest_hours = None, 0, 0.0

    summary = {
        "completed": completed_count,
        "total": total,
        "busiest_day_label": busiest_label,
        "busiest_count": busiest_count,
        "busiest_hours": busiest_hours,
        "completion_pct": round(completed_count / total * 100, 1) if total else 0.0,
    }

    start_label, end_label = _fmt_day(days_dates[0]), _fmt_day(days_dates[-1])
    range_label = f"{start_label} – {end_label}"

    return {
        "week_number": week_start.isocalendar()[1],
        "range_label": range_label,
        "days": days,
        "chart": chart,
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# Month overview
# ---------------------------------------------------------------------------

# Count thresholds: <=2, <=4, <=6, more. Hours thresholds: <=2, <=4.5, <=7, more.
_COUNT_THRESHOLDS = (2, 4, 6)
_HOURS_THRESHOLDS = (2, 4.5, 7)


def heat_level(value: float, thresholds: tuple[float, float, float]) -> int:
    if value <= 0:
        return 0
    if value <= thresholds[0]:
        return 1
    if value <= thresholds[1]:
        return 2
    if value <= thresholds[2]:
        return 3
    return 4


def compute_month_overview(db: Session, user: User, year: int, month: int) -> dict:
    # Python's calendar.Calendar uses 0=Monday..6=Sunday for firstweekday,
    # the opposite convention from this app's own week_start (0=Sunday,
    # 1=Monday) -- mapped once here rather than re-deriving the grid by
    # hand, reusing the stdlib's own correct leading/trailing-day logic.
    firstweekday = 6 if user.planner_week_start == 0 else 0
    cal = calendar.Calendar(firstweekday=firstweekday)
    grid_dates = list(cal.itermonthdates(year, month))

    start, end = grid_dates[0], grid_dates[-1]
    tasks = list_tasks_range(db, user, start, end)
    by_day: dict[date, list[PlannerTask]] = defaultdict(list)
    for t in tasks:
        by_day[t.due_date].append(t)

    measure = user.planner_heatmap_measure
    cells = []
    for d in grid_dates:
        day_tasks = by_day.get(d, [])
        count = len(day_tasks)
        hours = sum(t.duration_minutes or 0 for t in day_tasks if t.start_minute is not None) / 60
        level = heat_level(count, _COUNT_THRESHOLDS) if measure == "count" else heat_level(hours, _HOURS_THRESHOLDS)
        ordered = sorted(day_tasks, key=lambda t: (t.start_minute is None, t.start_minute or 0))
        preview = ordered[:2]
        cells.append(
            {
                "date": d,
                "in_month": d.month == month and d.year == year,
                "task_count": count,
                "hours": round(hours, 1),
                "level": level,
                "preview_titles": [t.title for t in preview],
                "preview_done": [t.status == "done" for t in preview],
                "more_count": max(0, count - len(preview)),
            }
        )

    in_month_days = {d: tks for d, tks in by_day.items() if d.month == month and d.year == year}
    if in_month_days:
        busiest_date = max(in_month_days, key=lambda d: len(in_month_days[d]))
        busiest_tasks = in_month_days[busiest_date]
        busiest = {
            "date": busiest_date,
            "task_count": len(busiest_tasks),
            "hours": round(sum(t.duration_minutes or 0 for t in busiest_tasks if t.start_minute is not None) / 60, 1),
        }
    else:
        busiest = {"date": None, "task_count": 0, "hours": 0.0}

    in_month_tasks = [t for t in tasks if t.due_date.month == month and t.due_date.year == year]
    done = sum(1 for t in in_month_tasks if t.status == "done")
    total = len(in_month_tasks)
    planned_hours = round(sum(t.duration_minutes or 0 for t in in_month_tasks if t.start_minute is not None) / 60, 1)

    return {
        "year": year,
        "month": month,
        "cells": cells,
        "busiest": busiest,
        "completed": {"done": done, "total": total, "pct": round(done / total * 100, 1) if total else 0.0},
        "planned_hours": planned_hours,
    }
