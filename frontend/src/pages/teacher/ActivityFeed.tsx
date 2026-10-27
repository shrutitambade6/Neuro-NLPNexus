import { useEffect, useState } from "react";
import { Activity, Award, BookOpenCheck, ClipboardCheck, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { fetchAdminOverview, type ActivityItem } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

const TYPE_ICON: Record<string, LucideIcon> = {
  lesson_complete: BookOpenCheck,
  quiz_attempt: ClipboardCheck,
  badge_earned: Award,
};

function iconFor(a: ActivityItem): LucideIcon {
  return TYPE_ICON[a.activity_type] ?? Activity;
}

// Reuses the real recent_activity feed already computed server-side for
// the dashboard overview (GET /admin/overview, capped at the same 20 most
// recent class-wide events) rather than a second endpoint — this page is
// just the fuller, dedicated view of the same real data.
export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminOverview()
      .then((ov) => active && setItems(ov.recent_activity))
      .catch(() => active && setError("Couldn't reach the backend, or this account isn't the admin account."));
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error}
      </div>
    );
  }

  if (!items) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Loading recent activity…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Recent Activity</h1>
        <p className="text-nexus-muted text-sm mt-0.5">Lab completions, quiz attempts, and module completions across the whole class.</p>
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        {items.length === 0 ? (
          <p className="text-sm text-nexus-muted">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-nexus-border ml-1.5 space-y-4">
            {items.map((a, i) => {
              const Icon = iconFor(a);
              return (
                <li key={i} className="pl-4 relative">
                  <span className="absolute -left-[13px] top-0.5 flex items-center justify-center h-5 w-5 rounded-full bg-nexus-accent/15">
                    <Icon size={11} className="text-nexus-accent" />
                  </span>
                  <p className="text-sm text-nexus-text">{a.detail ?? a.activity_type}</p>
                  <p className="text-[11px] text-nexus-muted font-mono">{formatDateTime(a.timestamp)}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
