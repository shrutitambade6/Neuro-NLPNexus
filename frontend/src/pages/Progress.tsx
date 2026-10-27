import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

import ProgressSummaryPanel from "../components/ProgressSummaryPanel";
import { useAuthStore } from "../store/authStore";
import { useProgressStore } from "../store/progressStore";

export default function Progress() {
  const token = useAuthStore((s) => s.token);
  const summary = useProgressStore((s) => s.summary);
  const refresh = useProgressStore((s) => s.refresh);

  useEffect(() => {
    if (token) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Your Progress</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Every number below is a real row from the backend's database — lessons and labs you
          marked complete, quiz attempts you made, and badges computed from them. Nothing here is
          simulated, and it's restored automatically every time you sign in.
        </p>
      </div>

      {!token ? (
        <div className="rounded-2xl border border-dashed border-nexus-border bg-nexus-surface/60 p-6 text-center space-y-3">
          <p className="text-sm text-nexus-muted">Sign in to see your real NLP and Deep Learning progress.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90"
          >
            <LogIn size={14} /> Sign in
          </Link>
        </div>
      ) : summary ? (
        <ProgressSummaryPanel summary={summary} activityLimit={10} />
      ) : (
        <p className="text-sm text-nexus-muted">Loading your real progress…</p>
      )}
    </div>
  );
}
