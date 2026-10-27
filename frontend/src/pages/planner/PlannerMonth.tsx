import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Clock, Flame, Plus } from "lucide-react";

import PlannerTopNav from "../../components/planner/PlannerTopNav";
import TaskModal from "../../components/planner/TaskModal";
import StatCard from "../../components/StatCard";
import { usePlannerStore } from "../../store/plannerStore";
import { fetchPlannerMonthOverview, type PlannerMonthCell, type PlannerMonthOverview } from "../../services/plannerApi";
import { formatShortDay, monthLabel, parseISODate, toISODate, todayLocal } from "../../utils/plannerDates";
import { nexusVar } from "../../utils/theme";

const HEAT_ALPHA = [0, 0.16, 0.36, 0.58, 0.85];

function weekdayHeaderLabels(weekStart: number): string[] {
  const base = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return [...base.slice(weekStart), ...base.slice(0, weekStart)];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function MonthCellView({
  cell,
  onOpenDay,
  onAddTask,
}: {
  cell: PlannerMonthCell;
  onOpenDay: () => void;
  onAddTask: () => void;
}) {
  const alpha = HEAT_ALPHA[cell.level] ?? 0;
  const d = parseISODate(cell.date);
  const isToday = toISODate(todayLocal()) === cell.date;

  return (
    <div
      onClick={onOpenDay}
      className={`group relative min-h-[88px] cursor-pointer rounded-lg border p-1.5 transition-colors ${
        cell.in_month ? "border-nexus-border" : "border-nexus-border/30"
      } ${isToday ? "ring-1 ring-nexus-accent" : ""}`}
      style={{ backgroundColor: alpha > 0 ? nexusVar("accent", alpha) : undefined }}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${cell.in_month ? "text-nexus-text" : "text-nexus-muted/50"}`}>{d.getDate()}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddTask();
          }}
          className="opacity-0 group-hover:opacity-100 rounded-full p-0.5 text-nexus-muted hover:text-nexus-text transition-opacity"
          aria-label="Add task"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="mt-1 space-y-0.5">
        {cell.preview_titles.map((title, i) => (
          <p key={i} className={`truncate text-[10px] ${cell.preview_done[i] ? "line-through text-nexus-muted" : "text-nexus-text"}`}>
            {title}
          </p>
        ))}
        {cell.more_count > 0 && <p className="text-[10px] text-nexus-muted">+{cell.more_count} more</p>}
      </div>
    </div>
  );
}

// Study Planner — Month screen (2026-10-07).
export default function PlannerMonth() {
  const navigate = useNavigate();
  const settings = usePlannerStore((s) => s.settings);
  const loadSettings = usePlannerStore((s) => s.loadSettings);
  const saveSettings = usePlannerStore((s) => s.saveSettings);
  const loadCategories = usePlannerStore((s) => s.loadCategories);

  const today = todayLocal();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [overview, setOverview] = useState<PlannerMonthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string>(toISODate(today));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlannerMonthOverview(year, month);
      setOverview(data);
    } catch {
      setError("Couldn't load this month — please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const goPrev = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const weekdayLabels = useMemo(() => weekdayHeaderLabels(settings.week_start), [settings.week_start]);
  const weeks = useMemo(() => (overview ? chunk(overview.cells, 7) : []), [overview]);

  const openCreate = (date: string) => {
    setCreateDate(date);
    setModalOpen(true);
  };
  const afterSave = () => {
    setModalOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <PlannerTopNav
        view="month"
        rangeLabel={`${monthLabel(month)} ${year}`}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onAddTask={() => openCreate(toISODate(today))}
      />

      {/* Poster panel */}
      <div className="relative overflow-hidden rounded-3xl border border-nexus-border p-6 sm:p-8" style={{
        background: `linear-gradient(135deg, ${nexusVar("accent", 0.18)}, ${nexusVar("purple", 0.14)})`,
      }}>
        <svg className="absolute -right-10 -top-10 h-56 w-56 opacity-30" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="90" fill="none" stroke={nexusVar("accent")} strokeWidth="1" />
          <circle cx="100" cy="100" r="60" fill="none" stroke={nexusVar("purple")} strokeWidth="1" />
          <circle cx="160" cy="70" r="5" fill={nexusVar("accent")} />
          <circle cx="60" cy="150" r="3" fill={nexusVar("purple")} />
        </svg>
        <span
          className="absolute -bottom-8 right-4 select-none font-display text-[7rem] sm:text-[9rem] font-bold leading-none"
          style={{ color: nexusVar("text", 0.04) }}
          aria-hidden="true"
        >
          {year}
        </span>
        <div className="relative flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-nexus-text">{monthLabel(month)}</h1>
          <button
            onClick={() => saveSettings({ heatmap_measure: settings.heatmap_measure === "hours" ? "count" : "hours" })}
            className="rounded-full border border-nexus-border bg-nexus-surface/80 px-3 py-1.5 text-xs font-medium text-nexus-muted hover:text-nexus-text shrink-0"
          >
            Heat by: {settings.heatmap_measure === "hours" ? "Hours" : "Count"}
          </button>
        </div>
      </div>

      {loading && !overview && <div className="py-16 text-center text-sm text-nexus-muted">Loading this month…</div>}
      {error && !overview && <div className="py-16 text-center text-sm text-nexus-bad">{error}</div>}

      {overview && (
        <>
          <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {weekdayLabels.map((w) => (
                <p key={w} className="text-center text-[11px] font-medium text-nexus-muted">
                  {w}
                </p>
              ))}
            </div>
            <div className="space-y-1.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((cell) => (
                    <MonthCellView
                      key={cell.date}
                      cell={cell}
                      onOpenDay={() => navigate(`/planner?date=${cell.date}`)}
                      onAddTask={() => openCreate(cell.date)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Busiest day"
              value={overview.busiest.date ? formatShortDay(parseISODate(overview.busiest.date)) : "—"}
              icon={Flame}
              hint={overview.busiest.date ? `${overview.busiest.task_count} tasks · ${overview.busiest.hours}h` : undefined}
            />
            <StatCard
              label="Completed this month"
              value={`${overview.completed.done}/${overview.completed.total}`}
              icon={CalendarCheck}
              hint={`${overview.completed.pct}% done`}
            />
            <StatCard label="Planned hours" value={overview.planned_hours} icon={Clock} hint="scheduled across the month" />
          </div>
        </>
      )}

      {modalOpen && <TaskModal onClose={() => setModalOpen(false)} onSaved={afterSave} onDeleted={afterSave} initialDate={createDate} task={null} />}
    </div>
  );
}
