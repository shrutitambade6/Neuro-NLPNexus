import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Award, ClipboardCheck, Loader2, UserCheck, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import StatCard from "../../components/StatCard";
import TeacherBirthdayAlert from "../../components/birthday/TeacherBirthdayAlert";
import {
  fetchAdminOverview,
  fetchNeedsAttention,
  type AdminOverview,
  type NeedsAttention,
} from "../../services/api";
import { formatDate } from "../../utils/formatDate";
import { nexusVar } from "../../utils/theme";

// The Teacher Dashboard spec asks for one page that immediately answers
// three questions: "How is my class progressing?", "Which students need
// attention?", "What has each student completed?" — this page is built
// as exactly those three sections (plus the summary cards every teacher
// dashboard needs), each linking to the fuller page that goes deeper.
function DomainBarChart({ overview }: { overview: AdminOverview }) {
  const data = [
    { domain: "NLP", pct: overview.nlp_progress.percentage, fill: nexusVar("purple") },
    { domain: "DL", pct: overview.dl_progress.percentage, fill: nexusVar("gold") },
  ];
  return (
    <div style={{ width: "100%", height: 140 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: nexusVar("muted"), fontSize: 11 }} unit="%" />
          <YAxis type="category" dataKey="domain" tick={{ fill: nexusVar("text"), fontSize: 12 }} width={40} />
          <Tooltip
            cursor={{ fill: nexusVar("accent", 0.06) }}
            formatter={(value: number) => [`${value}%`, "Avg. completion"]}
            contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
          />
          <Bar dataKey="pct" radius={[4, 4, 4, 4]} barSize={24}>
            {data.map((d) => (
              <Cell key={d.domain} fill={d.fill} />
            ))}
            <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} fill={nexusVar("text")} fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuestionCard({
  title,
  to,
  children,
  accent = "accent",
}: {
  title: string;
  to: string;
  children: React.ReactNode;
  accent?: "accent" | "warn";
}) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-nexus-border bg-nexus-surface p-5 hover:border-nexus-accentDim transition-colors"
    >
      <h2 className={`font-semibold text-sm mb-3 ${accent === "warn" ? "text-nexus-warn" : ""}`}>{title}</h2>
      {children}
    </Link>
  );
}

export default function TeacherDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [attention, setAttention] = useState<NeedsAttention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ov, att] = await Promise.all([fetchAdminOverview(), fetchNeedsAttention()]);
        if (!active) return;
        setOverview(ov);
        setAttention(att);
      } catch {
        if (active) setError("Couldn't reach the backend, or this account isn't the admin account.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Loading the real class overview…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error ?? "Something went wrong."}
      </div>
    );
  }

  const attentionCount = attention?.students.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Class Dashboard</h1>
        <p className="text-nexus-muted text-sm mt-0.5">
          Real, persisted progress across every signed-in student — not sampled or illustrative.
        </p>
      </div>

      {/* Birthday Experience milestone, point 12 — renders nothing unless
          at least one student the backend considers "related" to this
          teacher (every admin<->student pairing, see birthday_service.py)
          genuinely has a birthday today. */}
      <TeacherBirthdayAlert />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total students" value={overview.total_students} icon={Users} />
        <StatCard label="Active (7d)" value={overview.active_students_7d} icon={UserCheck} />
        <StatCard label="Overall completion" value={`${overview.overall_completion_percentage}%`} icon={Activity} />
        <StatCard label="Quiz attempts" value={overview.total_quiz_attempts} icon={ClipboardCheck} />
        <StatCard label="Avg. quiz score" value={overview.average_quiz_score != null ? `${overview.average_quiz_score}%` : "—"} icon={Award} />
        <StatCard label="Badges earned" value={overview.total_badges_earned} icon={Award} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QuestionCard title="How is my class progressing?" to="/admin/analytics/nlp">
          <DomainBarChart overview={overview} />
        </QuestionCard>

        <QuestionCard title="Which students need attention?" to="/admin/attention" accent={attentionCount > 0 ? "warn" : "accent"}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2.5 ${attentionCount > 0 ? "bg-nexus-warn/15" : "bg-nexus-good/15"}`}>
              <AlertTriangle size={18} className={attentionCount > 0 ? "text-nexus-warn" : "text-nexus-good"} />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-tight">{attentionCount}</p>
              <p className="text-xs text-nexus-muted">
                {attentionCount === 0 ? "No students flagged right now" : `student${attentionCount === 1 ? "" : "s"} flagged on objective signals`}
              </p>
            </div>
          </div>
        </QuestionCard>

        <QuestionCard title="What has each student completed?" to="/admin/students">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-nexus-accent/15 p-2.5">
              <Users size={18} className="text-nexus-accent" />
            </div>
            <div>
              <p className="text-2xl font-semibold leading-tight">{overview.total_students}</p>
              <p className="text-xs text-nexus-muted">Open the All Students table for per-student detail</p>
            </div>
          </div>
        </QuestionCard>
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Recent class activity</h2>
          <Link to="/admin/activity" className="text-xs text-nexus-accent hover:text-nexus-data">
            View all →
          </Link>
        </div>
        {overview.recent_activity.length === 0 ? (
          <p className="text-xs text-nexus-muted">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {overview.recent_activity.slice(0, 6).map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-xs text-nexus-muted border-b border-nexus-border/50 pb-1.5 last:border-0 last:pb-0">
                <span className="truncate">{a.detail ?? a.activity_type}</span>
                <span className="shrink-0 font-mono">{formatDate(a.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
