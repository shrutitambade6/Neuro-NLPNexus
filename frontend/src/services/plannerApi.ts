// Study Planner API client (2026-10-07). Separate file from services/api.ts
// (which stays untouched) -- this is purely additive, matching the
// backend's own additive-only approach to this feature. All requests go
// through the shared `api` axios instance so auth headers, the 401
// interceptor, and the API-status tracking in api.ts all keep working
// exactly the same way they do for every other feature in this app.
import { api } from "./api";

export const PLANNER_PRIORITIES = ["low", "medium", "high"] as const;
export type PlannerPriority = (typeof PLANNER_PRIORITIES)[number];

export const PLANNER_STATUSES = ["todo", "working", "done"] as const;
export type PlannerStatus = (typeof PLANNER_STATUSES)[number];

// Named accent keys -- see utils/plannerColors.ts for what each one
// actually renders as (theme-reactive, validated categorical palette).
export const PLANNER_CATEGORY_COLORS = ["lavender", "sky", "mint", "coral", "butter", "rose", "slate"] as const;
export type PlannerCategoryColor = (typeof PLANNER_CATEGORY_COLORS)[number];

export interface PlannerCategory {
  id: number;
  name: string;
  color: string;
}

export interface PlannerCategoryCreate {
  name: string;
  color?: PlannerCategoryColor;
}

export interface PlannerTask {
  id: number;
  title: string;
  description: string | null;
  category: PlannerCategory | null;
  priority: PlannerPriority;
  status: PlannerStatus;
  due_date: string; // YYYY-MM-DD
  start_minute: number | null;
  duration_minutes: number | null;
  completed_at: string | null;
}

export interface PlannerTaskCreate {
  title: string;
  description?: string | null;
  category_id?: number | null;
  priority?: PlannerPriority;
  due_date: string;
  start_minute?: number | null;
  duration_minutes?: number | null;
}

export interface PlannerTaskUpdate {
  title?: string;
  description?: string | null;
  category_id?: number | null;
  clear_category?: boolean;
  priority?: PlannerPriority;
  status?: PlannerStatus;
  due_date?: string;
  start_minute?: number | null;
  clear_start?: boolean;
  duration_minutes?: number | null;
}

export interface PlannerReschedule {
  due_date: string;
  start_minute: number;
}

export interface PlannerHabit {
  id: number;
  name: string;
}

export interface PlannerHabitWithStatus extends PlannerHabit {
  checked_today: boolean;
  week: boolean[]; // 7 entries, oldest first, ending on the viewed date
  streak: number;
}

export interface PlannerScheduleItem {
  id: number;
  title: string;
  status: PlannerStatus;
  start_minute: number;
  duration_minutes: number;
  category: PlannerCategory | null;
  is_now: boolean;
}

export interface PlannerProductivity {
  done: number;
  working: number;
  todo: number;
  done_pct: number;
  working_pct: number;
  todo_pct: number;
}

export interface PlannerFocusHour {
  hour: number;
  minutes: number;
}

export interface PlannerFocus {
  total_minutes: number;
  by_hour: PlannerFocusHour[];
  peak_hour: number | null;
  current_hour: number;
}

export interface PlannerCategoryBreakdown {
  name: string;
  color: string;
  minutes: number;
  task_count: number;
  pct: number;
}

export interface PlannerPrioritySplit {
  priority: PlannerPriority;
  done: number;
  pending: number;
}

export interface PlannerStats {
  my_tasks: number;
  completed: number;
  working: number;
  todo: number;
  completed_pct: number;
}

export interface PlannerDayOverview {
  date: string;
  stats: PlannerStats;
  overdue: PlannerTask[];
  schedule: PlannerScheduleItem[];
  tasks_today: PlannerTask[];
  tasks_upcoming: PlannerTask[];
  tasks_all: PlannerTask[];
  productivity: PlannerProductivity;
  focus: PlannerFocus;
  categories: PlannerCategoryBreakdown[];
  priority_split: PlannerPrioritySplit[];
  insights: string[];
  habits: PlannerHabitWithStatus[];
}

export interface PlannerWeekDay {
  date: string;
  label: string;
  is_today: boolean;
  no_time_tasks: PlannerTask[];
  timed_tasks: PlannerTask[];
}

export interface PlannerWeekChartPoint {
  label: string;
  planned_hours: number;
  completed_hours: number;
}

export interface PlannerWeekSummary {
  completed: number;
  total: number;
  busiest_day_label: string | null;
  busiest_count: number;
  busiest_hours: number;
  completion_pct: number;
}

export interface PlannerWeekOverview {
  week_number: number;
  range_label: string;
  days: PlannerWeekDay[];
  chart: PlannerWeekChartPoint[];
  summary: PlannerWeekSummary;
}

export interface PlannerMonthCell {
  date: string;
  in_month: boolean;
  task_count: number;
  hours: number;
  level: number; // 0-4
  preview_titles: string[];
  preview_done: boolean[];
  more_count: number;
}

export interface PlannerMonthBusiest {
  date: string | null;
  task_count: number;
  hours: number;
}

export interface PlannerMonthCompleted {
  done: number;
  total: number;
  pct: number;
}

export interface PlannerMonthOverview {
  year: number;
  month: number;
  cells: PlannerMonthCell[];
  busiest: PlannerMonthBusiest;
  completed: PlannerMonthCompleted;
  planned_hours: number;
}

export const PLANNER_HEATMAP_MEASURES = ["hours", "count"] as const;
export type PlannerHeatmapMeasure = (typeof PLANNER_HEATMAP_MEASURES)[number];

export interface PlannerSettings {
  week_start: number; // 0 = Sunday, 1 = Monday
  heatmap_measure: PlannerHeatmapMeasure;
}

export interface PlannerSettingsUpdate {
  week_start?: number;
  heatmap_measure?: PlannerHeatmapMeasure;
}

// --- Categories ---

export async function fetchPlannerCategories(): Promise<PlannerCategory[]> {
  const { data } = await api.get<PlannerCategory[]>("/planner/categories");
  return data;
}

export async function createPlannerCategory(payload: PlannerCategoryCreate): Promise<PlannerCategory> {
  const { data } = await api.post<PlannerCategory>("/planner/categories", payload);
  return data;
}

export async function deletePlannerCategory(categoryId: number): Promise<void> {
  await api.delete(`/planner/categories/${categoryId}`);
}

// --- Tasks ---

export async function fetchPlannerTasksRange(start: string, end: string): Promise<PlannerTask[]> {
  const { data } = await api.get<PlannerTask[]>("/planner/tasks", { params: { start, end } });
  return data;
}

export async function createPlannerTask(payload: PlannerTaskCreate): Promise<PlannerTask> {
  const { data } = await api.post<PlannerTask>("/planner/tasks", payload);
  return data;
}

export async function updatePlannerTask(taskId: number, payload: PlannerTaskUpdate): Promise<PlannerTask> {
  const { data } = await api.patch<PlannerTask>(`/planner/tasks/${taskId}`, payload);
  return data;
}

export async function reschedulePlannerTask(taskId: number, payload: PlannerReschedule): Promise<PlannerTask> {
  const { data } = await api.post<PlannerTask>(`/planner/tasks/${taskId}/reschedule`, payload);
  return data;
}

export async function deletePlannerTask(taskId: number): Promise<void> {
  await api.delete(`/planner/tasks/${taskId}`);
}

// --- Habits ---

export async function fetchPlannerHabits(): Promise<PlannerHabit[]> {
  const { data } = await api.get<PlannerHabit[]>("/planner/habits");
  return data;
}

export async function createPlannerHabit(name: string): Promise<PlannerHabit> {
  const { data } = await api.post<PlannerHabit>("/planner/habits", { name });
  return data;
}

export async function deletePlannerHabit(habitId: number): Promise<void> {
  await api.delete(`/planner/habits/${habitId}`);
}

export async function togglePlannerHabitCheck(habitId: number, date: string): Promise<boolean> {
  const { data } = await api.post<{ checked: boolean }>(`/planner/habits/${habitId}/check`, null, { params: { date } });
  return data.checked;
}

// --- Settings ---

export async function fetchPlannerSettings(): Promise<PlannerSettings> {
  const { data } = await api.get<PlannerSettings>("/planner/settings");
  return data;
}

export async function updatePlannerSettings(payload: PlannerSettingsUpdate): Promise<PlannerSettings> {
  const { data } = await api.patch<PlannerSettings>("/planner/settings", payload);
  return data;
}

// --- Overviews ---

export async function fetchPlannerDayOverview(date: string): Promise<PlannerDayOverview> {
  const { data } = await api.get<PlannerDayOverview>("/planner/overview/day", { params: { date } });
  return data;
}

export async function fetchPlannerWeekOverview(start: string): Promise<PlannerWeekOverview> {
  const { data } = await api.get<PlannerWeekOverview>("/planner/overview/week", { params: { start } });
  return data;
}

export async function fetchPlannerMonthOverview(year: number, month: number): Promise<PlannerMonthOverview> {
  const { data } = await api.get<PlannerMonthOverview>("/planner/overview/month", { params: { year, month } });
  return data;
}
