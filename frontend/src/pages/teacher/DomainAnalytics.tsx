import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import StatCard from "../../components/StatCard";
import { fetchDomainAnalytics, type Domain, type DomainAnalytics as DomainAnalyticsData } from "../../services/api";
import { nexusVar } from "../../utils/theme";
import { BarChart3, ClipboardCheck, Trophy, Users } from "lucide-react";

const ACCENT: Record<Domain, { token: "purple" | "gold"; title: string }> = {
  nlp: { token: "purple", title: "NLP Analytics" },
  dl: { token: "gold", title: "Deep Learning Analytics" },
};

// Shared by both /admin/analytics/nlp and /admin/analytics/dl — same
// shape of real, server-computed aggregate (see GET /admin/analytics/
// {domain}), with only a subtle accent-color difference between the two
// domains (spec point 7), not a different layout.
export default function DomainAnalytics({ domain }: { domain: Domain }) {
  const [data, setData] = useState<DomainAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accent = ACCENT[domain];

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchDomainAnalytics(domain)
      .then((d) => active && setData(d))
      .catch(() => active && setError("Couldn't reach the backend, or this account isn't the admin account."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [domain]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-nexus-muted mt-12 justify-center">
        <Loader2 size={16} className="animate-spin" /> Loading {accent.title.toLowerCase()}…
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: nexusVar(accent.token) }}>
          {accent.title}
        </h1>
        <p className="text-nexus-muted text-sm mt-0.5">Class-wide completion and quiz performance for this domain.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Students" value={data.total_students} icon={Users} />
        <StatCard label="Class completion" value={`${data.class_completion_percentage}%`} icon={BarChart3} />
        <StatCard label="Quiz attempts" value={data.total_quiz_attempts} icon={ClipboardCheck} />
        <StatCard label="Avg. quiz score" value={data.average_quiz_score != null ? `${data.average_quiz_score}%` : "—"} icon={Trophy} />
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <h2 className="font-semibold text-sm mb-3">Module completion</h2>
        <div className="space-y-3">
          {data.modules.map((m) => (
            <div key={m.module_id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-nexus-text">{m.label}</span>
                <span className="text-nexus-muted font-mono">
                  {m.completed_count}/{data.total_students} completed · {m.in_progress_count} in progress
                </span>
              </div>
              <div className="h-2 rounded-full bg-nexus-border overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${m.completion_percentage}%`, background: nexusVar(accent.token) }} />
              </div>
            </div>
          ))}
          {data.modules.length === 0 && <p className="text-xs text-nexus-muted">No modules in this domain's catalog.</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Score distribution</h2>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={data.score_distribution} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: nexusVar("muted"), fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: nexusVar("muted"), fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: nexusVar("accent", 0.06) }}
                  formatter={(value: number) => [value, "Attempts"]}
                  contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={nexusVar(accent.token)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Quiz performance by topic</h2>
          {data.quiz_topics.length === 0 ? (
            <p className="text-xs text-nexus-muted">No quiz attempts in this domain yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-nexus-muted border-b border-nexus-border">
                  <th className="py-1.5 pr-2 font-medium">Quiz</th>
                  <th className="py-1.5 pr-2 font-medium">Attempts</th>
                  <th className="py-1.5 pr-2 font-medium">Avg. score</th>
                  <th className="py-1.5 pr-2 font-medium">Pass rate*</th>
                </tr>
              </thead>
              <tbody>
                {data.quiz_topics.map((t) => (
                  <tr key={t.quiz_id} className="border-b border-nexus-border/50 last:border-0">
                    <td className="py-1.5 pr-2 text-nexus-text">{t.quiz_id}</td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.attempts}</td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.average_score}%</td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.pass_rate_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.quiz_topics.length > 0 && <p className="text-[10px] text-nexus-muted/70 mt-2">*Share of attempts scoring 60% or higher.</p>}
        </div>
      </div>
    </div>
  );
}
