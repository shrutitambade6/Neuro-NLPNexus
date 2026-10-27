import { Download, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import StatusBadge from "../../components/superadmin/StatusBadge";
import { fetchSuperAdminStudents, type SuperAdminStudentSummary } from "../../services/api";
import { downloadCsv, toCsv } from "../../utils/csv";
import { formatDate } from "../../utils/formatDate";

export default function StudentsList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<SuperAdminStudentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (term?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSuperAdminStudents(term);
      setStudents(res.students);
    } catch {
      setError("Couldn't reach the backend, or this account isn't the Super Admin account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search || undefined);
  };

  const handleExport = () => {
    const csv = toCsv(
      ["Username", "Full Name", "Status", "NLP %", "DL %", "Completed labs", "Quiz attempts", "Registered", "Last login", "Online"],
      students.map((s) => [
        s.username,
        // Username/Password Authentication milestone (2026-10-07) -- most
        // accounts now have no email on file; export full name instead.
        s.full_name ?? "",
        s.account_status,
        s.nlp_progress_pct,
        s.dl_progress_pct,
        s.completed_labs_count,
        s.quiz_attempts_count,
        formatDate(s.created_at),
        formatDate(s.last_login),
        s.is_online ? "yes" : "no",
      ])
    );
    downloadCsv("students.csv", csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-semibold text-lg text-slate-100">Students ({students.length})</h1>
        <button
          onClick={handleExport}
          disabled={students.length === 0}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100 border border-slate-800 rounded-lg px-3 py-1.5 hover:bg-slate-800 transition-colors disabled:opacity-40"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email…"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
        />
      </form>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : students.length === 0 ? (
        <p className="text-sm text-slate-500">No students match.</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="py-2.5 px-3 font-medium">Student</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">NLP</th>
                <th className="py-2.5 px-3 font-medium">DL</th>
                <th className="py-2.5 px-3 font-medium">Labs done</th>
                <th className="py-2.5 px-3 font-medium">Quiz attempts</th>
                <th className="py-2.5 px-3 font-medium">Registered</th>
                <th className="py-2.5 px-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/super-admin/students/${s.id}`)}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <p className="text-slate-100 font-medium flex items-center gap-1.5">
                      {s.username}
                      {s.is_online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />}
                    </p>
                    {s.full_name && <p className="text-slate-500">{s.full_name}</p>}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={s.account_status} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{s.nlp_progress_pct}%</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{s.dl_progress_pct}%</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.completed_labs_count}</td>
                  <td className="py-2.5 px-3 text-slate-300">{s.quiz_attempts_count}</td>
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(s.created_at)}</td>
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(s.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
