import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { fetchHeatmap, type Domain, type Heatmap, type HeatmapCellState } from "../../services/api";
const STATE_META: Record<HeatmapCellState, { label: string; dot: string }> = {
  completed: { label: "Completed", dot: "bg-nexus-good" },
  in_progress: { label: "In progress", dot: "bg-nexus-warn" },
  needs_attention: { label: "Needs attention (stalled)", dot: "bg-nexus-bad" },
  not_started: { label: "Not started", dot: "bg-nexus-border" },
};

function Cell({ state }: { state: HeatmapCellState }) {
  const meta = STATE_META[state];
  return <div title={meta.label} className={`h-5 w-5 rounded ${meta.dot} ${state === "not_started" ? "opacity-50" : ""}`} />;
}

// Class Progress Heatmap: per-student, per-module real status, derived
// entirely from learning_progress rows (see GET /admin/heatmap/{domain}).
// "Needs attention" here means an in_progress row that hasn't been
// touched in NEEDS_ATTENTION_STALE_DAYS — a real, measurable staleness
// signal, not a 4th invented status.
export default function ClassHeatmap() {
  const [domain, setDomain] = useState<Domain>("nlp");
  const [data, setData] = useState<Heatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHeatmap(domain)
      .then((d) => active && setData(d))
      .catch(() => active && setError("Couldn't reach the backend, or this account isn't the admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [domain]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Class Progress Heatmap</h1>
          <p className="text-nexus-muted text-sm mt-0.5">Every student, every module, at a glance.</p>
        </div>
        <div className="inline-flex rounded-lg border border-nexus-border bg-nexus-surface p-0.5">
          {(["nlp", "dl"] as Domain[]).map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                domain === d ? "bg-nexus-accent/15 text-nexus-text" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {d === "nlp" ? "NLP" : "Deep Learning"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-xs text-nexus-muted">
        {(Object.entries(STATE_META) as [HeatmapCellState, typeof STATE_META[HeatmapCellState]][]).map(([state, meta]) => (
          <span key={state} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded ${meta.dot}`} /> {meta.label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 overflow-x-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-nexus-muted justify-center py-8">
            <Loader2 size={16} className="animate-spin" /> Loading heatmap…
          </div>
        ) : error || !data ? (
          <p className="text-sm text-nexus-bad">{error ?? "Something went wrong."}</p>
        ) : data.rows.length === 0 ? (
          <p className="text-sm text-nexus-muted">No students yet.</p>
        ) : (
          <table className="text-xs border-separate" style={{ borderSpacing: "6px" }}>
            <thead>
              <tr>
                <th className="text-left font-medium text-nexus-muted pr-3 sticky left-0 bg-nexus-surface">Student</th>
                {data.module_labels.map((label) => (
                  <th key={label} className="font-medium text-nexus-muted px-1 whitespace-nowrap" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 90 }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.student_id}>
                  <td className="text-nexus-text pr-3 whitespace-nowrap sticky left-0 bg-nexus-surface">{row.username}</td>
                  {row.cells.map((cell) => (
                    <td key={cell.module_id}>
                      <Cell state={cell.state} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
