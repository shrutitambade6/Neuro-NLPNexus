import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flame,
  Lightbulb,
  ListChecks,
  Plus,
  Repeat,
  Timer,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import PlannerTopNav from "../../components/planner/PlannerTopNav";
import TaskModal from "../../components/planner/TaskModal";
import StatCard from "../../components/StatCard";
import { useAuthStore } from "../../store/authStore";
import { usePlannerStore } from "../../store/plannerStore";
import {
  createPlannerHabit,
  fetchPlannerDayOverview,
  togglePlannerHabitCheck,
  type PlannerDayOverview,
  type PlannerTask,
} from "../../services/plannerApi";
import { plannerCategoryMeta, PLANNER_PRIORITY_META } from "../../utils/plannerColors";
import { addDays, formatDayHeading, formatHour, formatMinuteOfDay, parseISODate, toISODate, todayLocal } from "../../utils/plannerDates";
import { nexusVar } from "../../utils/theme";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Study Planner — Dashboard (Day) screen (2026-10-07). Lives at /planner
// (reverted 2026-10-07 per user request -- originally replaced
// /dashboard, but /dashboard now stays the original command-center page,
// see pages/Dashboard.tsx).
export default function PlannerDashboard() {
  const username = useAuthStore((s) => s.user?.username);
  const loadCategories = usePlannerStore((s) => s.loadCategories);
  const loadSettings = usePlannerStore((s) => s.loadSettings);
  const editTask = usePlannerStore((s) => s.editTask);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialDateParam = searchParams.get("date");
  const [date, setDate] = useState<Date>(() => (initialDateParam ? parseISODate(initialDateParam) : todayLocal()));
  const [overview, setOverview] = useState<PlannerDayOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checklistTab, setChecklistTab] = useState<"today" | "upcoming" | "all">("today");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [newHabitName, setNewHabitName] = useState("");

  const isoDate = toISODate(date);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlannerDayOverview(isoDate);
      setOverview(data);
    } catch {
      setError("Couldn't load your planner — please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    if (searchParams.get("date")) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoDate]);

  const openCreate = () => {
    setEditingTask(null);
    setModalOpen(true);
  };
  const openEdit = (task: PlannerTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);
  const afterSave = () => {
    setModalOpen(false);
    load();
  };

  const quickToggle = async (task: PlannerTask) => {
    await editTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    load();
  };

  const toggleHabit = async (habitId: number) => {
    await togglePlannerHabitCheck(habitId, isoDate);
    load();
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    await createPlannerHabit(newHabitName.trim());
    setNewHabitName("");
    load();
  };

  if (loading && !overview) {
    return <div className="py-20 text-center text-sm text-nexus-muted">Loading your planner…</div>;
  }
  if (error && !overview) {
    return <div className="py-20 text-center text-sm text-nexus-bad">{error}</div>;
  }
  if (!overview) return null;

  const checklist =
    checklistTab === "today" ? overview.tasks_today : checklistTab === "upcoming" ? overview.tasks_upcoming : overview.tasks_all;

  const donutData = [
    { key: "done", value: overview.productivity.done, fill: nexusVar("good") },
    { key: "working", value: overview.productivity.working, fill: nexusVar("accent") },
    { key: "todo", value: overview.productivity.todo, fill: nexusVar("muted") },
  ].filter((d) => d.value > 0);

  const focusChartData = overview.focus.by_hour.map((h) => ({
    hour: formatHour(h.hour).replace(" ", ""),
    minutes: h.minutes,
    isPeak: h.hour === overview.focus.peak_hour,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting()}
          {username ? `, ${username}` : ""}
        </h1>
        <p className="text-nexus-muted text-sm mt-1">{formatDayHeading(date)}</p>
      </div>

      <PlannerTopNav
        view="day"
        rangeLabel={formatDayHeading(date)}
        onPrev={() => setDate((d) => addDays(d, -1))}
        onNext={() => setDate((d) => addDays(d, 1))}
        onToday={() => setDate(todayLocal())}
        onAddTask={openCreate}
      />

      {overview.overdue.length > 0 && (
        <div className="rounded-xl border border-nexus-bad/40 bg-nexus-bad/10 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-nexus-bad shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-nexus-bad">
              {overview.overdue.length} overdue task{overview.overdue.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {overview.overdue.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className="rounded-full border border-nexus-bad/30 bg-nexus-surface px-2.5 py-1 text-xs text-nexus-text hover:border-nexus-bad"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Tasks" value={overview.stats.my_tasks} icon={ListChecks} />
        <StatCard label="Completed" value={overview.stats.completed} icon={CheckCircle2} hint={`${overview.stats.completed_pct}% done`} />
        <StatCard label="In Progress" value={overview.stats.working} icon={Timer} />
        <StatCard label="To Do" value={overview.stats.todo} icon={Circle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Today's Schedule</h2>
          {overview.schedule.length === 0 ? (
            <p className="text-xs text-nexus-muted">Nothing scheduled — add a task with a time to see it here.</p>
          ) : (
            <ul className="space-y-2">
              {overview.schedule.map((item) => {
                const catMeta = plannerCategoryMeta(item.category?.color);
                return (
                  <li
                    key={item.id}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      item.is_now ? "border-nexus-accent bg-nexus-accent/5" : "border-nexus-border hover:border-nexus-accentDim"
                    }`}
                    onClick={() => {
                      const full = overview.tasks_all.find((t) => t.id === item.id);
                      if (full) openEdit(full);
                    }}
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${catMeta.dotClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${item.status === "done" ? "line-through text-nexus-muted" : "text-nexus-text"}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-nexus-muted">
                        {formatMinuteOfDay(item.start_minute)} · {item.duration_minutes} min
                      </p>
                    </div>
                    {item.is_now && <span className="text-[10px] font-medium text-nexus-accent shrink-0">NOW</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Tasks</h2>
            <div className="flex gap-1 rounded-full border border-nexus-border p-0.5">
              {(["today", "upcoming", "all"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChecklistTab(tab)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    checklistTab === tab ? "bg-nexus-accent text-white" : "text-nexus-muted hover:text-nexus-text"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {checklist.length === 0 ? (
            <p className="text-xs text-nexus-muted">No tasks here.</p>
          ) : (
            <ul className="space-y-1.5 max-h-80 overflow-y-auto">
              {checklist.map((t) => {
                const catMeta = plannerCategoryMeta(t.category?.color);
                return (
                  <li key={t.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-nexus-surfaceHover">
                    <button onClick={() => quickToggle(t)} aria-label="Toggle done" className="shrink-0">
                      {t.status === "done" ? (
                        <CheckCircle2 size={17} className="text-nexus-good" />
                      ) : (
                        <Circle size={17} className="text-nexus-muted" />
                      )}
                    </button>
                    <button onClick={() => openEdit(t)} className="flex-1 min-w-0 text-left">
                      <p className={`text-sm truncate ${t.status === "done" ? "line-through text-nexus-muted" : "text-nexus-text"}`}>{t.title}</p>
                    </button>
                    {t.category && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${catMeta.dotClass}`} />}
                    <span className={`text-[10px] font-medium shrink-0 ${PLANNER_PRIORITY_META[t.priority].textClass}`}>
                      {PLANNER_PRIORITY_META[t.priority].label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Productivity</h2>
          {donutData.length === 0 ? (
            <p className="text-xs text-nexus-muted">No tasks today yet.</p>
          ) : (
            <div className="relative" style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="key" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                    {donutData.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xl font-semibold">{overview.productivity.done_pct}%</p>
                <p className="text-[10px] text-nexus-muted">done</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-nexus-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-nexus-good" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-nexus-accent" /> In progress
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-nexus-muted" /> To do
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-sm">Focus Time</h2>
            <span className="text-xs text-nexus-muted">{overview.focus.total_minutes} min</span>
          </div>
          {overview.focus.total_minutes === 0 ? (
            <p className="text-xs text-nexus-muted mt-3">Mark a task "In Progress" to start tracking focus time.</p>
          ) : (
            <div style={{ width: "100%", height: 140 }}>
              <ResponsiveContainer>
                <BarChart data={focusChartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: nexusVar("muted"), fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: nexusVar("muted"), fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
                    formatter={(v: number) => [`${v} min`, "Focus"]}
                  />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {focusChartData.map((d, i) => (
                      <Cell key={i} fill={d.isPeak ? nexusVar("accent") : nexusVar("accentDim")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Categories</h2>
          {overview.categories.length === 0 ? (
            <p className="text-xs text-nexus-muted">No categorized tasks yet.</p>
          ) : (
            <div className="space-y-2.5">
              {overview.categories.map((c) => {
                const meta = plannerCategoryMeta(c.color);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-nexus-text">
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                        {c.name}
                      </span>
                      <span className="text-nexus-muted">
                        {c.task_count} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-nexus-border overflow-hidden">
                      <div className={`h-full rounded-full ${meta.dotClass}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Priority Split</h2>
          <div className="space-y-3">
            {overview.priority_split.map((p) => {
              const meta = PLANNER_PRIORITY_META[p.priority];
              const total = p.done + p.pending || 1;
              return (
                <div key={p.priority}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={meta.textClass}>{meta.label}</span>
                    <span className="text-nexus-muted">
                      {p.done} done · {p.pending} pending
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-nexus-border overflow-hidden flex">
                    <div className={meta.dotClass} style={{ width: `${(p.done / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <Lightbulb size={15} className="text-nexus-warn" /> Insights
          </h2>
          <ul className="space-y-2">
            {overview.insights.map((insight, i) => (
              <li key={i} className="text-sm text-nexus-text rounded-lg bg-nexus-bg border border-nexus-border/60 p-2.5">
                {insight}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
            <Repeat size={15} className="text-nexus-accent" /> Habits
          </h2>
          <div className="space-y-2.5">
            {overview.habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <button onClick={() => toggleHabit(h.id)} className="shrink-0" aria-label="Toggle habit">
                  {h.checked_today ? <CheckCircle2 size={18} className="text-nexus-good" /> : <Circle size={18} className="text-nexus-muted" />}
                </button>
                <span className="flex-1 text-sm truncate">{h.name}</span>
                <div className="flex gap-0.5">
                  {h.week.map((checked, i) => (
                    <span key={i} className={`h-2 w-2 rounded-full ${checked ? "bg-nexus-good" : "bg-nexus-border"}`} />
                  ))}
                </div>
                {h.streak > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-nexus-warn shrink-0">
                    <Flame size={11} /> {h.streak}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              placeholder="New habit…"
              className="flex-1 rounded-lg border border-nexus-border bg-nexus-bg px-3 py-1.5 text-sm outline-none focus:border-nexus-accentDim"
            />
            <button onClick={addHabit} className="rounded-lg border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text">
              <Plus size={15} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <TaskModal onClose={closeModal} onSaved={afterSave} onDeleted={afterSave} initialDate={isoDate} task={editingTask} />}
    </div>
  );
}
