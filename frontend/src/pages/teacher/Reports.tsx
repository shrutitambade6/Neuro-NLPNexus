import { useEffect, useState } from "react";
import { Download, FileDown, Loader2 } from "lucide-react";

import { fetchAdminStudents, fetchNeedsAttention, type StudentSummary, type AttentionItem } from "../../services/api";
import { downloadCsv, toCsv } from "../../utils/csv";

const ACTIVE_WINDOW_DAYS = 7;
function isActive(s: StudentSummary): boolean {
  if (!s.last_activity_at) return false;
  return (Date.now() - new Date(s.last_activity_at).getTime()) / 86_400_000 <= ACTIVE_WINDOW_DAYS;
}

function ReportCard({ title, description, disabled, onExport }: { title: string; description: string; disabled: boolean; onExport: () => void }) {
  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 flex items-center justify-between gap-4">
      <div>
        <h2 className="font-semibold text-sm">{title}</h2>
        <p className="text-xs text-nexus-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={onExport}
        disabled={disabled}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3 py-2 text-xs font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-40 transition-colors"
      >
        <Download size={13} /> Export CSV
      </button>
    </div>
  );
}

// "View/export basic class progress" (spec point 8) — real CSV exports
// built client-side from the same /admin/students and
// /admin/needs-attention responses the Students and Needs Attention pages
// already render, so there's nothing here that isn't visible elsewhere
// too; this page just packages it for a teacher who wants a file to keep
// or share outside the app.
export default function Reports() {
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [attention, setAttention] = useState<AttentionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminStudents(), fetchNeedsAttention()])
      .then(([list, att]) => {
        if (!active) return;
        setStudents(list.students);
        setAttention(att.students);
      })
      .catch(() => active && setError("Couldn't reach the backend, or this account isn't the admin account."));
    return () => {
      active = false;
    };
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const exportStudents = () => {
    if (!students) return;
    const csv = toCsv(
      ["Username", "Full Name", "NLP %", "DL %", "Quiz Attempts", "Avg Quiz Score", "Labs Completed", "Badges", "Last Active", "Status"],
      students.map((s) => [
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
    downloadCsv(`class-progress-${today}.csv`, csv);
  };

  const exportAttention = () => {
    if (!attention) return;
    const csv = toCsv(
      ["Username", "Full Name", "Reasons"],
      attention.map((item) => [item.student.username, item.student.full_name ?? "", item.reasons.map((r) => r.detail).join(" | ")]),
    );
    downloadCsv(`needs-attention-${today}.csv`, csv);
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 rounded-2xl border border-nexus-bad/40 bg-nexus-bad/10 p-5 text-sm text-nexus-bad">
        {error}
      </div>
    );
  }

  const loading = students === null || attention === null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-nexus-muted text-sm mt-0.5">Export real class progress as CSV — the same data shown elsewhere in the dashboard.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-nexus-muted justify-center py-8">
          <Loader2 size={16} className="animate-spin" /> Preparing reports…
        </div>
      ) : (
        <div className="space-y-3">
          <ReportCard
            title="Class progress (all students)"
            description={`${students?.length ?? 0} students — per-student NLP/DL %, quiz average, labs completed, last active.`}
            disabled={!students?.length}
            onExport={exportStudents}
          />
          <ReportCard
            title="Needs Attention list"
            description={`${attention?.length ?? 0} student(s) currently flagged, with their objective reasons.`}
            disabled={!attention?.length}
            onExport={exportAttention}
          />
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-nexus-muted/80 rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
        <FileDown size={14} className="shrink-0 mt-0.5" />
        CSV only, for now — it opens in Excel/Sheets and is enough to share basic class progress. A formatted PDF report isn't built yet.
      </div>
    </div>
  );
}
