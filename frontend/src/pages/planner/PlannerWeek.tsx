import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Flame, ListChecks } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import PlannerTopNav from "../../components/planner/PlannerTopNav";
import TaskModal from "../../components/planner/TaskModal";
import StatCard from "../../components/StatCard";
import { usePlannerStore } from "../../store/plannerStore";
import { fetchPlannerWeekOverview, type PlannerTask, type PlannerWeekOverview } from "../../services/plannerApi";
import { plannerCategoryMeta } from "../../utils/plannerColors";
import { addDays, formatMinuteOfDay, parseISODate, startOfWeek, toISODate, todayLocal } from "../../utils/plannerDates";
import { nexusVar } from "../../utils/theme";

// Grid runs 07:00 -> 22:00 in 30-minute slots, matching the spec's
// "07:00-22:00 time grid" -- a task outside this window still exists and
// shows up in the day's "No time" row's sibling data elsewhere (the
// Dashboard screen), it just isn't draggable on this particular grid.
const GRID_START = 7 * 60;
const GRID_END = 22 * 60;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 32;
const SLOT_COUNT = (GRID_END - GRID_START) / SLOT_MINUTES;
const PX_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES;
const GRID_HEIGHT = SLOT_COUNT * SLOT_HEIGHT;

function laneAssignment(tasks: PlannerTask[]): Map<number, number> {
  const sorted = [...tasks].sort((a, b) => (a.start_minute ?? 0) - (b.start_minute ?? 0));
  const laneEnds: number[] = [];
  const lanes = new Map<number, number>();
  for (const t of sorted) {
    const start = t.start_minute ?? 0;
    const end = start + (t.duration_minutes ?? 60);
    let lane = laneEnds.findIndex((endMin) => endMin <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    lanes.set(t.id, lane);
  }
  return lanes;
}

function TaskBlock({ task, laneCount, lane }: { task: PlannerTask; laneCount: number; lane: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task-${task.id}`, data: { task } });
  const start = task.start_minute ?? GRID_START;
  const duration = task.duration_minutes ?? 30;
  const top = Math.max(0, (start - GRID_START) * PX_PER_MINUTE);
  const height = Math.max(20, duration * PX_PER_MINUTE - 2);
  const widthPct = 100 / laneCount;
  const catMeta = plannerCategoryMeta(task.category?.color);

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: "absolute",
        top,
        height,
        left: `${lane * widthPct}%`,
        width: `calc(${widthPct}% - 2px)`,
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        zIndex: isDragging ? 20 : 5,
      }}
      className={`rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight overflow-hidden transition-shadow ${catMeta.chipClass} ${
        task.status === "done" ? "opacity-50" : ""
      } ${isDragging ? "shadow-lg cursor-grabbing" : "cursor-grab"}`}
      title={task.title}
    >
      <p className="truncate font-medium">{task.title}</p>
      {height > 32 && <p className="truncate opacity-80">{formatMinuteOfDay(start)}</p>}
    </button>
  );
}

function DayColumn({
  date,
  tasks,
  nowMinute,
  isToday,
  onSlotClick,
}: {
  date: string;
  tasks: PlannerTask[];
  nowMinute: number | null;
  isToday: boolean;
  onSlotClick: (minute: number) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `day-${date}`, data: { date } });
  const lanes = useMemo(() => laneAssignment(tasks), [tasks]);
  const laneCount = Math.max(1, ...Array.from(lanes.values()).map((l) => l + 1));

  return (
    <div
      ref={setNodeRef}
      className="relative border-l border-nexus-border/60"
      style={{ height: GRID_HEIGHT }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const minute = GRID_START + Math.round(offsetY / PX_PER_MINUTE / 15) * 15;
        onSlotClick(Math.min(GRID_END - 15, Math.max(GRID_START, minute)));
      }}
    >
      {Array.from({ length: SLOT_COUNT }).map((_, i) => (
        <div key={i} className="border-t border-nexus-border/30" style={{ height: SLOT_HEIGHT }} />
      ))}
      {isToday && nowMinute !== null && nowMinute >= GRID_START && nowMinute <= GRID_END && (
        <div
          className="absolute left-0 right-0 border-t-2 border-nexus-bad pointer-events-none"
          style={{ top: (nowMinute - GRID_START) * PX_PER_MINUTE }}
        />
      )}
      {tasks.map((t) => (
        <TaskBlock key={t.id} task={t} lane={lanes.get(t.id) ?? 0} laneCount={laneCount} />
      ))}
    </div>
  );
}

// Study Planner — Week screen (2026-10-07).
export default function PlannerWeek() {
  const weekStartSetting = usePlannerStore((s) => s.settings.week_start);
  const loadSettings = usePlannerStore((s) => s.loadSettings);
  const loadCategories = usePlannerStore((s) => s.loadCategories);
  const rescheduleTask = usePlannerStore((s) => s.rescheduleTask);

  const [anchor, setAnchor] = useState<Date>(() => todayLocal());
  const [overview, setOverview] = useState<PlannerWeekOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [createDate, setCreateDate] = useState<string>(toISODate(anchor));
  const [createMinute, setCreateMinute] = useState<number | null>(null);
  const [nowMinute, setNowMinute] = useState<number>(() => new Date().getHours() * 60 + new Date().getMinutes());

  const weekStartDate = useMemo(() => startOfWeek(anchor, weekStartSetting), [anchor, weekStartSetting]);
  const weekStartISO = toISODate(weekStartDate);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlannerWeekOverview(weekStartISO);
      setOverview(data);
    } catch {
      setError("Couldn't load this week — please try again.");
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
  }, [weekStartISO]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMinute(new Date().getHours() * 60 + new Date().getMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    if (!over) return;
    const task = (active.data.current as { task: PlannerTask } | undefined)?.task;
    const targetDate = (over.data.current as { date: string } | undefined)?.date;
    if (!task || !targetDate) return;
    const minuteDelta = Math.round(delta.y / PX_PER_MINUTE / 15) * 15;
    const originalStart = task.start_minute ?? GRID_START;
    const newStart = Math.min(GRID_END - 15, Math.max(GRID_START, originalStart + minuteDelta));
    if (targetDate === task.due_date && newStart === originalStart) return;
    try {
      await rescheduleTask(task.id, { due_date: targetDate, start_minute: newStart });
      load();
    } catch {
      setError("Couldn't reschedule that task — please try again.");
    }
  };

  const openEdit = (task: PlannerTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };
  const openCreate = (date: string, minute: number | null) => {
    setEditingTask(null);
    setCreateDate(date);
    setCreateMinute(minute);
    setModalOpen(true);
  };
  const afterSave = () => {
    setModalOpen(false);
    load();
  };

  const weekRangeLabel = overview ? `Week ${overview.week_number} · ${overview.range_label}` : "";

  return (
    <div className="space-y-6">
      <PlannerTopNav
        view="week"
        rangeLabel={weekRangeLabel}
        onPrev={() => setAnchor((d) => addDays(d, -7))}
        onNext={() => setAnchor((d) => addDays(d, 7))}
        onToday={() => setAnchor(todayLocal())}
        onAddTask={() => openCreate(toISODate(anchor), null)}
      />

      {loading && !overview && <div className="py-16 text-center text-sm text-nexus-muted">Loading this week…</div>}
      {error && !overview && <div className="py-16 text-center text-sm text-nexus-bad">{error}</div>}

      {overview && (
        <>
          <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4">
            <div
              className="grid"
              style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}
            >
              <div />
              {overview.days.map((d) => (
                <div key={d.date} className={`text-center pb-2 ${d.is_today ? "text-nexus-accent" : "text-nexus-text"}`}>
                  <p className="text-xs font-medium">{d.label}</p>
                  <p className="text-[11px] text-nexus-muted">{parseISODate(d.date).getDate()}</p>
                </div>
              ))}

              <div className="text-[11px] text-nexus-muted pt-1">No time</div>
              {overview.days.map((d) => (
                <div key={`nt-${d.date}`} className="flex flex-wrap gap-1 px-1 pb-2 min-h-[28px]">
                  {d.no_time_tasks.map((t) => {
                    const meta = plannerCategoryMeta(t.category?.color);
                    return (
                      <button
                        key={t.id}
                        onClick={() => openEdit(t)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] truncate max-w-full ${meta.chipClass} ${
                          t.status === "done" ? "opacity-50" : ""
                        }`}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => openCreate(d.date, null)}
                    className="rounded-full border border-dashed border-nexus-border px-1.5 text-[10px] text-nexus-muted hover:text-nexus-text"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="overflow-y-auto max-h-[600px]">
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
                  <div>
                    {Array.from({ length: SLOT_COUNT }).map((_, i) => {
                      const minute = GRID_START + i * SLOT_MINUTES;
                      return (
                        <div key={i} style={{ height: SLOT_HEIGHT }} className="text-right pr-2 -translate-y-1.5">
                          {minute % 60 === 0 && <span className="text-[10px] text-nexus-muted">{formatMinuteOfDay(minute)}</span>}
                        </div>
                      );
                    })}
                  </div>
                  {overview.days.map((d) => (
                    <DayColumn
                      key={d.date}
                      date={d.date}
                      tasks={d.timed_tasks}
                      nowMinute={nowMinute}
                      isToday={d.is_today}
                      onSlotClick={(minute) => openCreate(d.date, minute)}
                    />
                  ))}
                </div>
              </div>
            </DndContext>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-nexus-border bg-nexus-surface p-5">
              <h2 className="font-semibold text-sm mb-3">This Week</h2>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={overview.chart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: nexusVar("muted"), fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: nexusVar("muted"), fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: nexusVar("muted") }} />
                    <Bar dataKey="planned_hours" name="Planned" fill={nexusVar("accentDim")} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed_hours" name="Completed" fill={nexusVar("good")} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <StatCard
                label="Completed this week"
                value={`${overview.summary.completed}/${overview.summary.total}`}
                icon={ListChecks}
                hint={`${overview.summary.completion_pct}% done`}
              />
              <StatCard
                label="Busiest day"
                value={overview.summary.busiest_day_label ?? "—"}
                icon={Flame}
                hint={overview.summary.busiest_day_label ? `${overview.summary.busiest_count} tasks · ${overview.summary.busiest_hours}h` : undefined}
              />
              <StatCard label="Planned this week" value={overview.days.length} icon={CalendarDays} hint="days in view" />
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <TaskModal
          onClose={() => setModalOpen(false)}
          onSaved={afterSave}
          onDeleted={afterSave}
          initialDate={createDate}
          initialMinute={createMinute}
          task={editingTask}
        />
      )}
    </div>
  );
}
