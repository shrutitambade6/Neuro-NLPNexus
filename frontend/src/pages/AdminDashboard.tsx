import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import StatCard from "../components/StatCard";
import {
  fetchAdminOverview,
  fetchAdminStudentDetail,
  fetchAdminStudents,
  type AdminOverview,
  type StudentDetailResponse,
  type StudentSummary,
} from "../services/api";
import { nexusVar } from "../utils/theme";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ProgressPill({ pct, colorToken }: { pct: number; colorToken: "purple" | "gold" }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-nexus-border overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: nexusVar(colorToken) }}
        />
      </div>
      <span className="text-xs font-mono text-nexus-muted w-9 text-right">{pct}%</span>
    </div>
  );
}

function DomainBarChart({ overview }: { overview: AdminOverview }) {
  const data = [
    { domain: "NLP", pct: overview.nlp_progress.percentage, fill: nexusVar("purple") },
    { domain: "DL", pct: overview.dl_progress.percentage, fill: nexusVar("gold") },
  ];
  return (
    <div style={{ width: "100%", height: 160 }}>
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
          <Bar dataKey="pct" radius={[4, 4, 4, 4]} barSize={28}>
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

function StudentDetailPanel({ detail, onClose }: { detail: StudentDetailResponse; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{detail.student.username}</h3>
          {/* Username/Password Authentication milestone (2026-10-07) --
              most students now have no email; show full name instead, and
              only render the line at all when there's something to show. */}
          {detail.student.full_name && <p className="text-xs text-nexus-muted">{detail.student.full_name}</p>}
        </div>
        <button onClick={onClose} className="text-nexus-muted hover:text-nexus-text">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-nexus-purple/30 bg-nexus-purple/5 p-3">
          <p className="text-xs font-medium text-nexus-purple mb-1">
            NLP — {detail.student.nlp_progress.completed}/{detail.student.nlp_progress.total} lessons
          </p>
          <ProgressPill pct={detail.student.nlp_progress.percentage} colorToken="purple" />
          <ul className="mt-2 space-y-0.5">
            {detail.nlp_entries.map((e) => (
              <li key={e.id} className="text-[11px] text-nexus-muted">
                ✓ {e.module_id} — {e.completed_at ? formatDate(e.completed_at) : "in progress"}
              </li>
            ))}
            {detail.nlp_entries.length === 0 && <li className="text-[11px] text-nexus-muted">No NLP lessons completed yet.</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-nexus-gold/30 bg-nexus-gold/5 p-3">
          <p className="text-xs font-medium text-nexus-gold mb-1">
            DL — {detail.student.dl_progress.completed}/{detail.student.dl_progress.total} lessons
          </p>
          <ProgressPill pct={detail.student.dl_progress.percentage} colorToken="gold" />
          <ul className="mt-2 space-y-0.5">
            {detail.dl_entries.map((e) => (
              <li key={e.id} className="text-[11px] text-nexus-muted">
                ✓ {e.module_id} — {e.completed_at ? formatDate(e.completed_at) : "in progress"}
              </li>
            ))}
            {detail.dl_entries.length === 0 && <li className="text-[11px] text-nexus-muted">No DL lessons completed yet.</li>}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-nexus-muted mb-1.5">Quiz results ({detail.quiz_results.length})</p>
        {detail.quiz_results.length === 0 ? (
          <p className="text-xs text-nexus-muted">No quiz attempts yet.</p>
        ) : (
          <div className="space-y-1">
            {detail.quiz_results.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-xs text-nexus-muted border-b border-nexus-border/50 py-1">
                <span>{q.quiz_id}</span>
                <span className="font-mono text-nexus-text">{q.score}% ({q.correct_answers}/{q.total_questions})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-nexus-muted mb-1.5">Badges ({detail.badges.length})</p>
        <div className="flex flex-wrap gap-1.5">
          {detail.badges.map((b) => (
            <span key={b.key} title={b.description} className="inline-flex items-center gap-1 rounded-full border border-nexus-good/40 bg-nexus-good/10 px-2 py-0.5 text-[11px] text-nexus-good">
              <Award size={11} /> {b.label}
            </span>
          ))}
          {detail.badges.length === 0 && <p className="text-xs text-nexus-muted">No badges earned yet.</p>}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-nexus-muted mb-1.5">Recent activity</p>
        <ul className="space-y-1">
          {detail.activity_history.slice(0, 8).map((a, i) => (
            <li key={i} className="text-[11px] text-nexus-muted flex justify-between gap-2">
              <span>{a.detail ?? a.activity_type}</span>
              <span className="shrink-0 font-mono">{formatDate(a.timestamp)}</span>
            </li>
          ))}
          {detail.activity_history.length === 0 && <li className="text-[11px] text-nexus-muted">No activity yet.</li>}
        </ul>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StudentDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadAll = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ov, list] = await Promise.all([fetchAdminOverview(), fetchAdminStudents(searchTerm)]);
      setOverview(ov);
      setStudents(list.students);
    } catch {
      setError("Couldn't reach the backend, or this account isn't the admin account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAll(search || undefined);
  };

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminStudentDetail(id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-nexus-accent" size={22} />
        <div>
          <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
          <p className="text-nexus-muted text-sm mt-0.5">
            Real, persisted progress across every signed-in student — not sampled or illustrative.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total students" value={overview.total_students} icon={Users} />
        <StatCard label="Active (7d)" value={overview.active_students_7d} icon={UserCheck} />
        <StatCard label="Overall completion" value={`${overview.overall_completion_percentage}%`} icon={Activity} />
        <StatCard label="Quiz attempts" value={overview.total_quiz_attempts} icon={ClipboardCheck} />
        <StatCard label="Avg. quiz score" value={overview.average_quiz_score != null ? `${overview.average_quiz_score}%` : "—"} icon={Award} />
        <StatCard label="Badges earned" value={overview.total_badges_earned} icon={Award} />
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <h2 className="font-semibold mb-3 text-sm">Class progress by domain</h2>
        <DomainBarChart overview={overview} />
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Students ({students.length})</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            />
            <button type="submit" className="rounded-lg border border-nexus-border px-2 py-1.5 text-nexus-muted hover:text-nexus-text">
              <Search size={14} />
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-nexus-muted border-b border-nexus-border">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">NLP</th>
                <th className="py-2 pr-3 font-medium">DL</th>
                <th className="py-2 pr-3 font-medium">Quizzes</th>
                <th className="py-2 pr-3 font-medium">Badges</th>
                <th className="py-2 pr-3 font-medium">Last activity</th>
                <th className="py-2 pr-1 font-medium" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => openDetail(s.id)}
                  className={`border-b border-nexus-border/50 cursor-pointer hover:bg-nexus-surfaceAlt transition-colors ${
                    selectedId === s.id ? "bg-nexus-accent/5" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <p className="text-nexus-text font-medium">{s.username}</p>
                    {s.full_name && <p className="text-nexus-muted">{s.full_name}</p>}
                  </td>
                  <td className="py-2 pr-3"><ProgressPill pct={s.nlp_progress.percentage} colorToken="purple" /></td>
                  <td className="py-2 pr-3"><ProgressPill pct={s.dl_progress.percentage} colorToken="gold" /></td>
                  <td className="py-2 pr-3 text-nexus-muted">
                    {s.quiz_attempts} {s.average_quiz_score != null && `(avg ${s.average_quiz_score}%)`}
                  </td>
                  <td className="py-2 pr-3 text-nexus-muted">{s.badges_earned}</td>
                  <td className="py-2 pr-3 text-nexus-muted">{formatDate(s.last_activity_at)}</td>
                  <td className="py-2 pr-1 text-nexus-muted"><ChevronRight size={14} /></td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-nexus-muted">
                    No students match that search yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedId && (
        detailLoading ? (
          <div className="flex items-center gap-2 text-sm text-nexus-muted">
            <Loader2 size={14} className="animate-spin" /> Loading student detail…
          </div>
        ) : detail ? (
          <StudentDetailPanel detail={detail} onClose={() => { setSelectedId(null); setDetail(null); }} />
        ) : null
      )}
    </div>
  );
}
