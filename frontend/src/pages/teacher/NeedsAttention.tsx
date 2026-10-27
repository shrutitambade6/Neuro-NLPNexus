import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, Loader2, TrendingDown, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { fetchNeedsAttention, type AttentionReason, type NeedsAttention as NeedsAttentionData } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

// Spec requirement: "objectively identify students with low progress,
// repeated failed quizzes, incomplete labs or prolonged inactivity
// without using negative labels such as 'weak student'". Each reason
// shown here is exactly the factual code+detail string the backend
// computed from real thresholds (see admin_service.py's NEEDS_ATTENTION_*
// constants) — nothing here is a label, only a measurement.
const REASON_META: Record<AttentionReason["code"], { label: string; icon: LucideIcon }> = {
  low_progress: { label: "Low progress", icon: TrendingDown },
  failed_quizzes: { label: "Repeated low quiz scores", icon: AlertCircle },
  incomplete_labs: { label: "Incomplete labs", icon: Clock },
  inactivity: { label: "Prolonged inactivity", icon: UserX },
};

export default function NeedsAttention() {
  const [data, setData] = useState<NeedsAttentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchNeedsAttention()
      .then((d) => active && setData(d))
      .catch(() => active && setError("Couldn't reach the backend, or this account isn't the admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Checking real progress against objective thresholds…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error ?? "Something went wrong."}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Needs Attention</h1>
        <p className="text-nexus-muted text-sm mt-0.5">
          Students flagged by objective, measurable signals — not a judgment, a checklist. Generated {formatDateTime(data.generated_at)}.
        </p>
      </div>

      {data.students.length === 0 ? (
        <div className="rounded-2xl border border-nexus-good/30 bg-nexus-good/5 p-6 text-center">
          <CheckCircle2 size={28} className="mx-auto text-nexus-good mb-2" />
          <p className="text-sm text-nexus-text font-medium">No students currently meet any attention threshold.</p>
          <p className="text-xs text-nexus-muted mt-1">Checked against: low progress, repeated low quiz scores, stale labs, and inactivity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.students.map((item) => (
            <Link
              key={item.student.id}
              to={`/admin/students/${item.student.id}`}
              className="block rounded-2xl border border-nexus-warn/30 bg-nexus-warn/5 p-4 hover:border-nexus-warn/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{item.student.username}</p>
                  {item.student.full_name && <p className="text-xs text-nexus-muted">{item.student.full_name}</p>}
                </div>
                <span className="text-[11px] text-nexus-muted font-mono">
                  {item.reasons.length} signal{item.reasons.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="space-y-1">
                {item.reasons.map((r, i) => {
                  const meta = REASON_META[r.code];
                  const Icon = meta.icon;
                  return (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-nexus-muted">
                      <Icon size={13} className="text-nexus-warn shrink-0 mt-0.5" />
                      <span>
                        <span className="text-nexus-text font-medium">{meta.label}:</span> {r.detail}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
