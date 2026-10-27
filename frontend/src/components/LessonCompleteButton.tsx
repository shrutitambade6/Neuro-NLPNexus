import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Loader2, LogIn } from "lucide-react";

import { recordLessonComplete, type Domain } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useProgressStore } from "../store/progressStore";

// Real, persisted "mark this lesson/lab complete" control. One of these
// sits on every trackable page (see utils/progressCatalog.ts, which must
// list the same moduleId or the backend rejects it with a 422 — this
// component surfaces that error rather than silently pretending it
// worked). Not decorative: a click is a real POST to /api/progress/complete,
// and the completed state shown here comes back from the real backend on
// every login (see progressStore.refresh()), not from anything cached only
// in this browser.
export default function LessonCompleteButton({ domain, moduleId, label }: { domain: Domain; moduleId: string; label: string }) {
  const token = useAuthStore((s) => s.token);
  const isComplete = useProgressStore((s) => s.isLessonComplete(domain, moduleId));
  const refresh = useProgressStore((s) => s.refresh);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-nexus-border bg-nexus-surface/60 px-4 py-3 text-xs text-nexus-muted">
        <Circle size={14} className="shrink-0" />
        <span>
          <Link to="/login" className="text-nexus-accent hover:text-nexus-data inline-flex items-center gap-1">
            <LogIn size={12} /> Sign in
          </Link>{" "}
          to track your real progress on {label}.
        </span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isComplete || loading) return;
    setLoading(true);
    setError(null);
    try {
      await recordLessonComplete(domain, moduleId);
      await refresh();
    } catch {
      setError("Couldn't save your progress — check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isComplete || loading}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
          isComplete
            ? "border-nexus-good/40 bg-nexus-good/10 text-nexus-good cursor-default"
            : domain === "nlp"
              ? "border-nexus-purple/40 bg-nexus-purple/10 text-nexus-purple hover:bg-nexus-purple/20"
              : "border-nexus-gold/40 bg-nexus-gold/10 text-nexus-gold hover:bg-nexus-gold/20"
        } disabled:opacity-80`}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isComplete ? (
          <CheckCircle2 size={15} />
        ) : (
          <Circle size={15} />
        )}
        {isComplete ? `${label} — completed` : `Mark ${label} as complete`}
      </button>
      {error && <span className="text-xs text-nexus-bad">{error}</span>}
    </div>
  );
}
