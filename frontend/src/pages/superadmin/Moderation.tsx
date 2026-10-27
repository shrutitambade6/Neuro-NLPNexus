import { Eye, Flag, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  fetchSuperAdminReportContent,
  fetchSuperAdminReports,
  resolveSuperAdminReport,
  type SuperAdminReport,
  type SuperAdminReportContent,
} from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

type Filter = "open" | "reviewed" | "dismissed" | "all";

function ReportContentModal({ reportId, onClose }: { reportId: number; onClose: () => void }) {
  const [content, setContent] = useState<SuperAdminReportContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuperAdminReportContent(reportId)
      .then(setContent)
      .catch(() => setError("Couldn't load this report's content."));
  }, [reportId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-100">Reported content</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
        <p className="text-[10.5px] text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          Viewing this is logged to the Audit Log. Private message content is only ever reachable
          through a filed report, never browsed directly.
        </p>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {!content && !error ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : content ? (
          <div className="text-xs space-y-1.5">
            <p className="text-slate-500">
              {content.target_type} #{content.target_id} · by {content.author_username} ·{" "}
              {formatDateTime(content.created_at)}
            </p>
            <p className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-slate-200 whitespace-pre-wrap">
              {content.content}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Moderation() {
  const [reports, setReports] = useState<SuperAdminReport[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingReportId, setViewingReportId] = useState<number | null>(null);
  const [resolving, setResolving] = useState<SuperAdminReport | null>(null);
  const [suspendAlso, setSuspendAlso] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSuperAdminReports(filter === "all" ? undefined : filter)
      .then((res) => setReports(res.reports))
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleResolve = async (resolution: "reviewed" | "dismissed") => {
    if (!resolving) return;
    setBusy(true);
    try {
      await resolveSuperAdminReport(resolving.id, {
        resolution,
        action: suspendAlso && resolution === "reviewed" ? "suspend_user" : null,
      });
      setResolving(null);
      setSuspendAlso(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="font-display font-semibold text-lg text-slate-100">Community Moderation</h1>

      <div className="flex gap-1.5">
        {(["open", "reviewed", "dismissed", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-[11px] capitalize transition-colors ${
              filter === f ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:bg-slate-800 border border-transparent"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-500">No reports in this filter.</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 divide-y divide-slate-800/60">
          {reports.map((r) => (
            <div key={r.id} className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Flag size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="text-slate-200">
                    {r.target_type} #{r.target_id} reported by <span className="font-medium">{r.reporter_username}</span>
                  </p>
                  <p className="text-slate-500 mt-0.5">{r.reason}</p>
                  <p className="text-slate-600 mt-0.5">
                    {formatDateTime(r.created_at)}
                    {r.reviewed_by_username && ` · reviewed by ${r.reviewed_by_username}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10.5px] capitalize text-slate-400">{r.status}</span>
                <button
                  onClick={() => setViewingReportId(r.id)}
                  className="flex items-center gap-1 text-[10.5px] text-slate-300 hover:text-slate-100 border border-slate-800 rounded-lg px-2 py-1 hover:bg-slate-800 transition-colors"
                >
                  <Eye size={11} /> View
                </button>
                {r.status === "open" && (
                  <button
                    onClick={() => setResolving(r)}
                    className="text-[10.5px] text-indigo-300 hover:text-indigo-100 border border-indigo-500/30 rounded-lg px-2 py-1 hover:bg-indigo-500/10 transition-colors"
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingReportId !== null && (
        <ReportContentModal reportId={viewingReportId} onClose={() => setViewingReportId(null)} />
      )}

      {resolving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            setResolving(null);
            setSuspendAlso(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="font-semibold text-sm text-slate-100">Resolve report #{resolving.id}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Mark this reviewed (optionally suspending the content's author) or dismissed as not
                a violation. Either way, this is written to the Audit Log.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={suspendAlso}
                onChange={(e) => setSuspendAlso(e.target.checked)}
                className="accent-indigo-500"
              />
              Also suspend the content's author
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setResolving(null);
                  setSuspendAlso(false);
                }}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve("dismissed")}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-300 border border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleResolve("reviewed")}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-xs font-medium bg-indigo-500/90 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
              >
                {busy ? "Working…" : "Mark reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
