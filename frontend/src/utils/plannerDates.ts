// Small, dependency-free date helpers for the Study Planner screens
// (2026-10-07). Deliberately NOT using a date library -- every value here
// is a plain local-wall-clock calendar date (matching the backend's own
// "never blind UTC" design for PlannerTask.due_date, see
// planner_service.py), so these just need to be correct for *local* Date
// math, which native Date already does fine when we stick to
// year/month/day components and avoid any UTC conversion.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// weekStart: 0 = Sunday, 1 = Monday (matches PlannerSettings.week_start).
// Returns the first day of the 7-day window containing `d`.
export function startOfWeek(d: Date, weekStart: number): Date {
  const dow = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (dow - weekStart + 7) % 7;
  return addDays(d, -diff);
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function weekdayLabel(d: Date): string {
  return WEEKDAY_LABELS[d.getDay()];
}

export function monthLabel(month: number): string {
  return MONTH_LABELS[month - 1];
}

export function formatDayHeading(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShortDay(d: Date): string {
  return `${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

// Renders a minute-of-day (0-1439) as "9:00 AM" / "1:30 PM".
export function formatMinuteOfDay(minute: number): string {
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${period}`;
}

export function clampMinute(minute: number): number {
  return Math.max(0, Math.min(1439, minute));
}

// Snap a raw minute offset to the nearest 15-minute grid line.
export function snapMinute(minute: number, step = 15): number {
  return clampMinute(Math.round(minute / step) * step);
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}
