import {
  Activity,
  AlertOctagon,
  BarChart3,
  BookOpen,
  Cpu,
  Flag,
  GraduationCap,
  Loader2,
  MessageSquare,
  Trophy,
  UserCheck,
  Users,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import StatCard from "../../components/superadmin/StatCard";
import { fetchSuperAdminOverview, type RecentEvent, type SuperAdminOverview } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

// High-level platform overview — intentionally just totals and counts,
// never a row of individual student/teacher names or any confidential
// field. Drilling into an actual person's data always goes through the
// Students/Teachers sections, never from here (spec: "without exposing
// unnecessary confidential information on the main screen").
const EVENT_ICON: Record<RecentEvent["kind"], typeof Activity> = {
  audit: Activity,
  login_failed: AlertOctagon,
  report_filed: Flag,
};

const EVENT_TONE: Record<RecentEvent["kind"], string> = {
  audit: "text-indigo-400",
  login_failed: "text-amber-400",
  report_filed: "text-rose-400",
};

export default function Overview() {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuperAdminOverview()
      .then(setData)
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."));
  }, []);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Loading overview…
      </div>
    );
  }

  const { stats, recent_events } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-semibold text-lg text-slate-100">Platform Overview</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time totals from the live database — nothing below is sample or placeholder data.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total students" value={stats.total_students} icon={Users} />
        <StatCard label="Total teachers" value={stats.total_teachers} icon={GraduationCap} />
        <StatCard label="Active (7d)" value={stats.active_users} icon={UserCheck} />
        <StatCard label="Online now" value={stats.online_now} icon={Wifi} />
        <StatCard label="Registered this week" value={stats.registered_this_week} icon={Users} />
        <StatCard label="NLP activity" value={stats.nlp_activity_count} icon={BookOpen} />
        <StatCard label="DL activity" value={stats.dl_activity_count} icon={Cpu} />
        <StatCard label="Completed labs" value={stats.completed_labs_count} icon={BarChart3} />
        <StatCard label="Quiz activity" value={stats.quiz_activity_count} icon={Trophy} />
        <StatCard label="Community activity" value={stats.community_activity_count} icon={MessageSquare} />
        <StatCard
          label="Open reports"
          value={stats.open_reports_count}
          icon={Flag}
          tone={stats.open_reports_count > 0 ? "warning" : "default"}
        />
      </div>

      {stats.open_reports_count > 0 && (
        <Link
          to="/super-admin/moderation"
          className="block rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300 hover:bg-amber-500/10 transition-colors"
        >
          {stats.open_reports_count} report{stats.open_reports_count === 1 ? "" : "s"} awaiting review →
          Community Moderation
        </Link>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Recent system events</h2>
        {recent_events.length === 0 ? (
          <p className="text-xs text-slate-500">No events recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {recent_events.map((event, i) => {
              const Icon = EVENT_ICON[event.kind];
              return (
                <li key={i} className="flex items-start gap-2.5 text-xs">
                  <Icon size={13} className={`mt-0.5 shrink-0 ${EVENT_TONE[event.kind]}`} />
                  <span className="text-slate-300 flex-1">{event.summary}</span>
                  <span className="text-slate-500 shrink-0 font-mono">{formatDateTime(event.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
