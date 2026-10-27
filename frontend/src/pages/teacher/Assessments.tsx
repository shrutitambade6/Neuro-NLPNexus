import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2, Target, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import StatCard from "../../components/StatCard";
import { fetchAssessments, type Assessments as AssessmentsData } from "../../services/api";
import { nexusVar } from "../../utils/theme";

export default function Assessments() {
  const [data, setData] = useState<AssessmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAssessments()
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
        <Loader2 size={16} className="animate-spin" /> Loading assessment data…
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
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <p className="text-nexus-muted text-sm mt-0.5">Quiz attempts, scores, and topic-wise performance across both domains.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total attempts" value={data.total_attempts} icon={ClipboardCheck} />
        <StatCard label="Average score" value={data.average_score != null ? `${data.average_score}%` : "—"} icon={Trophy} />
        <StatCard label="Quiz topics" value={data.topic_performance.length} icon={Target} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Score distribution</h2>
          <div style={{ width: "100%", height: 220 }}>
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
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={nexusVar("accent")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
          <h2 className="font-semibold text-sm mb-3">Topic-wise performance</h2>
          {data.topic_performance.length === 0 ? (
            <p className="text-xs text-nexus-muted">No quiz attempts recorded yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-nexus-muted border-b border-nexus-border">
                  <th className="py-1.5 pr-2 font-medium">Quiz</th>
                  <th className="py-1.5 pr-2 font-medium">Domain</th>
                  <th className="py-1.5 pr-2 font-medium">Attempts</th>
                  <th className="py-1.5 pr-2 font-medium">Avg.</th>
                  <th className="py-1.5 pr-2 font-medium">Pass rate*</th>
                </tr>
              </thead>
              <tbody>
                {data.topic_performance.map((t) => (
                  <tr key={`${t.domain}-${t.quiz_id}`} className="border-b border-nexus-border/50 last:border-0">
                    <td className="py-1.5 pr-2 text-nexus-text">{t.quiz_id}</td>
                    <td className="py-1.5 pr-2">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          color: nexusVar(t.domain === "nlp" ? "purple" : "gold"),
                          background: nexusVar(t.domain === "nlp" ? "purple" : "gold", 0.1),
                        }}
                      >
                        {t.domain.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.attempts}</td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.average_score}%</td>
                    <td className="py-1.5 pr-2 text-nexus-muted">{t.pass_rate_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data.topic_performance.length > 0 && <p className="text-[10px] text-nexus-muted/70 mt-2">*Share of attempts scoring 60% or higher.</p>}
        </div>
      </div>
    </div>
  );
}
