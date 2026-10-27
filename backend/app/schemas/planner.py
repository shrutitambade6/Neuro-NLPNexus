"""
Schemas for the Study Planner milestone (2026-10-07) -- a brand-new
Task/Category/Habit/focus-session feature, built additively alongside
the existing NLP/DL learning platform (no existing model/route touched).
See app/services/planner_service.py for the real logic; this file is
shapes only.
"""
from datetime import date as date_
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

PRIORITIES = ("low", "medium", "high")
STATUSES = ("todo", "working", "done")
# Named accent keys, not raw hex -- the frontend maps these to the actual
# Tailwind/CSS-variable colors (see utils/plannerColors.ts), so a theme
# tweak never needs a backend/data migration.
CATEGORY_COLORS = ("lavender", "sky", "mint", "coral", "butter", "rose", "slate")
HEATMAP_MEASURES = ("hours", "count")


class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    color: str = Field("lavender", max_length=16)

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if v not in CATEGORY_COLORS:
            raise ValueError(f"color must be one of {CATEGORY_COLORS}")
        return v


class TaskOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: CategoryOut | None
    priority: str
    status: str
    due_date: date_
    start_minute: int | None
    duration_minutes: int | None
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


def _validate_priority(v: str) -> str:
    if v not in PRIORITIES:
        raise ValueError(f"priority must be one of {PRIORITIES}")
    return v


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    category_id: int | None = None
    priority: str = Field("medium", max_length=8)
    due_date: date_
    # Both optional together -- an omitted start_minute is exactly the
    # spec's "No time" row (a task with no scheduled slot). When
    # start_minute IS given but duration_minutes is omitted, the service
    # defaults it to 60 (the spec's own quick-add default), rather than
    # rejecting the request.
    start_minute: int | None = Field(None, ge=0, le=1439)
    duration_minutes: int | None = Field(None, ge=5, le=1440)

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        return _validate_priority(v)


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    category_id: int | None = None
    clear_category: bool = False  # explicit "unset" flag -- category_id=None alone is ambiguous with "don't change"
    priority: str | None = Field(None, max_length=8)
    status: str | None = Field(None, max_length=8)
    due_date: date_ | None = None
    start_minute: int | None = Field(None, ge=0, le=1439)
    clear_start: bool = False  # same ambiguity-resolution as clear_category, for "move to No time"
    duration_minutes: int | None = Field(None, ge=5, le=1440)

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_priority(v)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None and v not in STATUSES:
            raise ValueError(f"status must be one of {STATUSES}")
        return v


class RescheduleRequest(BaseModel):
    """What a drag-reschedule on the Week grid actually sends -- the new
    date (which column the pointer was over) and the new start, already
    snapped to 15 minutes and clamped to the grid by the frontend. A
    separate, narrower endpoint than the general PATCH above so a drag
    can never accidentally also rewrite title/priority/etc."""

    due_date: date_
    start_minute: int = Field(..., ge=0, le=1439)


class HabitOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class HabitWithStatus(HabitOut):
    checked_today: bool
    week: list[bool]  # 7 entries, oldest first, ending on the viewed date
    streak: int


class ScheduleItemOut(BaseModel):
    id: int
    title: str
    status: str
    start_minute: int
    duration_minutes: int
    category: CategoryOut | None
    is_now: bool


class ProductivityOut(BaseModel):
    done: int
    working: int
    todo: int
    done_pct: float
    working_pct: float
    todo_pct: float


class FocusHourOut(BaseModel):
    hour: int
    minutes: int


class FocusOut(BaseModel):
    total_minutes: int
    by_hour: list[FocusHourOut]
    peak_hour: int | None
    current_hour: int


class CategoryBreakdownOut(BaseModel):
    name: str
    color: str
    minutes: int
    task_count: int
    pct: float


class PrioritySplitOut(BaseModel):
    priority: str
    done: int
    pending: int


class StatsOut(BaseModel):
    my_tasks: int
    completed: int
    working: int
    todo: int
    completed_pct: float


class DayOverviewOut(BaseModel):
    date: date_
    stats: StatsOut
    overdue: list[TaskOut]
    schedule: list[ScheduleItemOut]
    tasks_today: list[TaskOut]
    tasks_upcoming: list[TaskOut]
    tasks_all: list[TaskOut]
    productivity: ProductivityOut
    focus: FocusOut
    categories: list[CategoryBreakdownOut]
    priority_split: list[PrioritySplitOut]
    insights: list[str]
    habits: list[HabitWithStatus]


class WeekDayOut(BaseModel):
    date: date_
    label: str  # "Mon", "Tue", ...
    is_today: bool
    no_time_tasks: list[TaskOut]
    timed_tasks: list[TaskOut]


class WeekChartPointOut(BaseModel):
    label: str
    planned_hours: float
    completed_hours: float


class WeekSummaryOut(BaseModel):
    completed: int
    total: int
    busiest_day_label: str | None
    busiest_count: int
    busiest_hours: float
    completion_pct: float


class WeekOverviewOut(BaseModel):
    week_number: int
    range_label: str
    days: list[WeekDayOut]
    chart: list[WeekChartPointOut]
    summary: WeekSummaryOut


class MonthCellOut(BaseModel):
    date: date_
    in_month: bool
    task_count: int
    hours: float
    level: int  # 0-4, see planner_service.heat_level()
    preview_titles: list[str]  # up to 2, already truncated
    preview_done: list[bool]
    more_count: int


class MonthBusiestOut(BaseModel):
    date: date_ | None
    task_count: int
    hours: float


class MonthCompletedOut(BaseModel):
    done: int
    total: int
    pct: float


class MonthOverviewOut(BaseModel):
    year: int
    month: int
    cells: list[MonthCellOut]
    busiest: MonthBusiestOut
    completed: MonthCompletedOut
    planned_hours: float


class SettingsOut(BaseModel):
    week_start: int  # 0 = Sunday, 1 = Monday
    heatmap_measure: str


class SettingsUpdate(BaseModel):
    week_start: int | None = Field(None, ge=0, le=1)
    heatmap_measure: str | None = Field(None, max_length=8)

    @field_validator("heatmap_measure")
    @classmethod
    def validate_measure(cls, v: str | None) -> str | None:
        if v is not None and v not in HEATMAP_MEASURES:
            raise ValueError(f"heatmap_measure must be one of {HEATMAP_MEASURES}")
        return v
