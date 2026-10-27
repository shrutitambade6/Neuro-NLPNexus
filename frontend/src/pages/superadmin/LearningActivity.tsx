import { BookOpen, Loader2, Table2, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import StatCard from "../../components/superadmin/StatCard";
import { fetchSuperAdminLearningActivity, type SuperAdminLearningActivity } from "../../services/api";

// Two small time-series charts over the platform's real activity logs —
// colors are the dataviz skill's own pre-validated dark-mode categorical
// slots (references/palette.md: blue #3987e5, orange #d95926, aqua
// #199e70), reused as-is rather than inventing new hex values for this
// portal's navy surface, since those three in that order already clear
// every CVD/contrast gate on a dark background.
const SERIES = {
  nlp: "#3987e5",
  dl: "#d95926",
  discussions: "#3987e5",
  replies: "#d95926",
  messages: "#199e70",
};

function ChartCard({
  title,
  children,
  table,
}: {
  title: string;
  children: React.ReactNode;
  table: { headers: string[]; rows: (string | number)[][] };
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-slate-200 transition-colors"
        >
          <Table2 size={11} /> {showTable ? "Show chart" : "Show as table"}
        </button>
      </div>
      {showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                {table.headers.map((h) => (
                  <th key={h} className="py-1.5 pr-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/60 last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1.5 pr-3 text-slate-300 font-mono">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}

export default function LearningActivity() {
  const [data, setData] = useState<SuperAdminLearningActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuperAdminLearningActivity()
      .then(setData)
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."));
  }, []);

  if (error) return <p className="text-sm text-rose-400">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display font-semibold text-lg text-slate-100">Learning Activity</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Quiz pass rate" value={`${data.quiz_pass_rate_pct}%`} icon={Trophy} />
        <StatCard label="Total quiz attempts" value={data.total_quiz_attempts} icon={Trophy} />
        <StatCard label="Total completed labs" value={data.total_completed_labs} icon={BookOpen} />
      </div>

      <ChartCard
        title="Daily NLP vs. Deep Learning activity (last 14 days)"
        table={{
          headers: ["Date", "NLP", "DL"],
          rows: data.daily_activity.map((p) => [p.date, p.nlp_count, p.dl_count]),
        }}
      >
        <ResponsiveContainer>
          <LineChart data={data.daily_activity} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="nlp_count" name="NLP" stroke={SERIES.nlp} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="dl_count" name="Deep Learning" stroke={SERIES.dl} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Daily community activity (last 14 days)"
        table={{
          headers: ["Date", "Discussions", "Replies", "Messages"],
          rows: data.daily_community.map((p) => [p.date, p.discussions, p.replies, p.messages]),
        }}
      >
        <ResponsiveContainer>
          <LineChart data={data.daily_community} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="discussions" name="Discussions" stroke={SERIES.discussions} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="replies" name="Replies" stroke={SERIES.replies} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="messages" name="Messages" stroke={SERIES.messages} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
