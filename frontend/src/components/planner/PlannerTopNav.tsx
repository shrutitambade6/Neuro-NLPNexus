import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export type PlannerView = "day" | "week" | "month";

// Shared top bar for all three Study Planner screens: the
// Day/Week/Month segmented switcher (navigates between /planner,
// /planner/week, /planner/month), a prev/next/Today date stepper,
// and the "Add task" button. Each screen owns its own date state and
// just passes the navigation callbacks down.
export default function PlannerTopNav({
  view,
  rangeLabel,
  onPrev,
  onNext,
  onToday,
  onAddTask,
}: {
  view: PlannerView;
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddTask: () => void;
}) {
  const navigate = useNavigate();

  const VIEWS: { key: PlannerView; label: string; path: string }[] = [
    { key: "day", label: "Today", path: "/planner" },
    { key: "week", label: "Week", path: "/planner/week" },
    { key: "month", label: "Month", path: "/planner/month" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-nexus-border bg-nexus-surface p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => navigate(v.path)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v.key ? "bg-nexus-accent text-white" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            className="rounded-full border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
            aria-label="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="rounded-full border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
            aria-label="Next"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={onToday}
            className="rounded-full border border-nexus-border px-3 py-1.5 text-xs font-medium text-nexus-muted hover:text-nexus-text"
          >
            Today
          </button>
        </div>

        <span className="text-sm font-medium text-nexus-text">{rangeLabel}</span>
      </div>

      <button
        onClick={onAddTask}
        className="flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
      >
        <Plus size={15} /> Add task
      </button>
    </div>
  );
}
