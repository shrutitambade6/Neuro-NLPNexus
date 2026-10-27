import { ChevronLeft, ChevronRight, FileClock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchSuperAdminAuditLog, type SuperAdminAuditLogEntry } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [entries, setEntries] = useState<SuperAdminAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchSuperAdminAuditLog(actionType || undefined, page)
      .then((res) => {
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."))
      .finally(() => setLoading(false));
  }, [actionType, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-semibold text-lg text-slate-100 flex items-center gap-2">
          <FileClock size={18} className="text-indigo-400" /> Audit Log
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable — every row is an administrative action that actually happened, with the
          administrator's identity, the action, and the affected account. Nothing here can be
          edited or deleted.
        </p>
      </div>

      <input
        value={actionType}
        onChange={(e) => {
          setActionType(e.target.value);
          setPage(1);
        }}
        placeholder="Filter by action type (e.g. account_status_changed)…"
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">No audit log entries match.</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="py-2.5 px-3 font-medium">When</th>
                <th className="py-2.5 px-3 font-medium">Administrator</th>
                <th className="py-2.5 px-3 font-medium">Action</th>
                <th className="py-2.5 px-3 font-medium">Affected account</th>
                <th className="py-2.5 px-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                  <td className="py-2.5 px-3 text-slate-200">{e.actor_username}</td>
                  <td className="py-2.5 px-3 text-indigo-300 font-mono">{e.action_type}</td>
                  <td className="py-2.5 px-3 text-slate-300">{e.target_username ?? "—"}</td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-xs">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 disabled:opacity-40 hover:text-slate-100"
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 disabled:opacity-40 hover:text-slate-100"
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
