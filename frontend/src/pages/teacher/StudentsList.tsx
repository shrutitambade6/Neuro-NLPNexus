import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronRight, Download, Loader2, Search } from "lucide-react";

import { fetchAdminStudents, type StudentSummary } from "../../services/api";
import { downloadCsv, toCsv } from "../../utils/csv";
import { formatDate } from "../../utils/formatDate";
import { nexusVar } from "../../utils/theme";

type SortKey = "username" | "nlp" | "dl" | "quiz" | "activity";
type StatusFilter = "all" | "active" | "inactive";

const ACTIVE_WINDOW_DAYS = 7;

function isActive(student: StudentSummary): boolean {
  if (!student.last_activity_at) return false;
  const days = (Date.now() - new Date(student.last_activity_at).getTime()) / 86_400_000;
  return days <= ACTIVE_WINDOW_DAYS;
}

function ProgressPill({ pct, colorToken }: { pct: number; colorToken: "purple" | "gold" }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-nexus-border overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: nexusVar(colorToken) }} />
      </div>
      <span className="text-xs font-mono text-nexus-muted w-9 text-right">{pct}%</span>
    </div>
  );
}

function SortHeader({ label, sortKey, active, dir, onClick }: { label: string; sortKey: SortKey; active: boolean; dir: "asc" | "desc"; onClick: (k: SortKey) => void }) {
  return (
    <th className="py-2 pr-3 font-medium">
      <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-nexus-text transition-colors">
        {label}
        <ArrowUpDown size={11} className={active ? "text-nexus-accent" : "text-nexus-muted/50"} />
        {active && <span className="text-[9px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

// All Students: a real, searchable/filterable/sortable table over
// /admin/students (the same endpoint the old single-page Teacher Dashboard
// used) — the search term still round-trips to the backend (it already
// supports it), while status filter and column sort are fast enough to do
// client-side over the one page of results.
export default function StudentsList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("activity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminStudents(searchTerm);
      setStudents(list.students);
    } catch {
      setError("Couldn't reach the backend, or this account isn't the admin account.");
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

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const visible = useMemo(() => {
    let rows = students;
    if (statusFilter !== "all") {
      rows = rows.filter((s) => (statusFilter === "active" ? isActive(s) : !isActive(s)));
    }
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "username":
          cmp = a.username.localeCompare(b.username);
          break;
        case "nlp":
          cmp = a.nlp_progress.percentage - b.nlp_progress.percentage;
          break;
        case "dl":
          cmp = a.dl_progress.percentage - b.dl_progress.percentage;
          break;
        case "quiz":
          cmp = (a.average_quiz_score ?? -1) - (b.average_quiz_score ?? -1);
          break;
        case "activity":
          cmp = new Date(a.last_activity_at ?? 0).getTime() - new Date(b.last_activity_at ?? 0).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, statusFilter, sortKey, sortDir]);

  const handleExport = () => {
    const csv = toCsv(
      ["Username", "Full Name", "NLP %", "DL %", "Quiz Attempts", "Avg Quiz Score", "Labs Completed", "Badges", "Last Active", "Status"],
      visible.map((s) => [
        s.username,
        // Username/Password Authentication milestone (2026-10-07) -- most
        // students now have no email on file; export full name instead.
        s.full_name ?? "",
        s.nlp_progress.percentage,
        s.dl_progress.percentage,
        s.quiz_attempts,
        s.average_quiz_score ?? "",
        s.nlp_progress.completed + s.dl_progress.completed,
        s.badges_earned,
        s.last_activity_at ?? "",
        isActive(s) ? "Active" : "Inactive",
      ]),
    );
    downloadCsv(`class-students-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">All Students</h1>
          <p className="text-nexus-muted text-sm mt-0.5">{students.length} student{students.length === 1 ? "" : "s"} — real, persisted progress.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={visible.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim transition-colors disabled:opacity-40"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-nexus-accent/50 w-56"
          />
          <button type="submit" className="rounded-lg border border-nexus-border px-2 py-1.5 text-nexus-muted hover:text-nexus-text">
            <Search size={14} />
          </button>
        </form>

        <div className="inline-flex rounded-lg border border-nexus-border bg-nexus-bg p-0.5">
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                statusFilter === f ? "bg-nexus-accent/15 text-nexus-text" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-nexus-muted justify-center py-8">
            <Loader2 size={16} className="animate-spin" /> Loading students…
          </div>
        ) : error ? (
          <p className="text-sm text-nexus-bad">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-nexus-muted border-b border-nexus-border">
                  <SortHeader label="Student" sortKey="username" active={sortKey === "username"} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="NLP" sortKey="nlp" active={sortKey === "nlp"} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="DL" sortKey="dl" active={sortKey === "dl"} dir={sortDir} onClick={handleSort} />
                  <SortHeader label="Quiz avg" sortKey="quiz" active={sortKey === "quiz"} dir={sortDir} onClick={handleSort} />
                  <th className="py-2 pr-3 font-medium">Labs completed</th>
                  <SortHeader label="Last active" sortKey="activity" active={sortKey === "activity"} dir={sortDir} onClick={handleSort} />
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const active = isActive(s);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/admin/students/${s.id}`)}
                      className="border-b border-nexus-border/50 cursor-pointer hover:bg-nexus-surfaceAlt transition-colors"
                    >
                      <td className="py-2 pr-3">
                        <p className="text-nexus-text font-medium">{s.username}</p>
                        {s.full_name && <p className="text-nexus-muted">{s.full_name}</p>}
                      </td>
                      <td className="py-2 pr-3"><ProgressPill pct={s.nlp_progress.percentage} colorToken="purple" /></td>
                      <td className="py-2 pr-3"><ProgressPill pct={s.dl_progress.percentage} colorToken="gold" /></td>
                      <td className="py-2 pr-3 text-nexus-muted">{s.average_quiz_score != null ? `${s.average_quiz_score}%` : "—"}</td>
                      <td className="py-2 pr-3 text-nexus-muted">{s.nlp_progress.completed + s.dl_progress.completed}</td>
                      <td className="py-2 pr-3 text-nexus-muted">{formatDate(s.last_activity_at)}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-nexus-good/10 text-nexus-good" : "bg-nexus-border/60 text-nexus-muted"}`}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 pr-1 text-nexus-muted"><ChevronRight size={14} /></td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-nexus-muted">
                      No students match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
