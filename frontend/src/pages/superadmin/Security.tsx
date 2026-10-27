import { AlertTriangle, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import StatCard from "../../components/superadmin/StatCard";
import { fetchSuperAdminSecurityOverview, revokeSuperAdminSession, type SuperAdminSecurityOverview } from "../../services/api";
import { formatDateTime } from "../../utils/formatDate";

export default function Security() {
  const [data, setData] = useState<SuperAdminSecurityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  const load = () => {
    fetchSuperAdminSecurityOverview()
      .then(setData)
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."));
  };

  useEffect(load, []);

  const handleRevoke = async (sessionId: number) => {
    setRevokingId(sessionId);
    try {
      await revokeSuperAdminSession(sessionId);
      load();
    } finally {
      setRevokingId(null);
    }
  };

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
      <h1 className="font-display font-semibold text-lg text-slate-100">Security</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Failed logins (24h)"
          value={data.failed_login_count_24h}
          icon={AlertTriangle}
          tone={data.failed_login_count_24h > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Suspicious patterns"
          value={data.suspicious.length}
          icon={ShieldAlert}
          tone={data.suspicious.length > 0 ? "critical" : "default"}
        />
        <StatCard label="Active sessions" value={data.active_sessions.length} icon={LogOut} />
      </div>

      {data.suspicious.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4">
          <h2 className="text-sm font-semibold text-rose-300 mb-2 flex items-center gap-1.5">
            <ShieldAlert size={14} /> Suspicious activity
          </h2>
          <ul className="space-y-1.5 text-xs">
            {data.suspicious.map((s, i) => (
              <li key={i} className="text-rose-200">
                {s.failed_count} failed attempts against <span className="font-mono">{s.email_attempted}</span> in
                the last {s.window_minutes} minutes
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Active sessions</h2>
        {data.active_sessions.length === 0 ? (
          <p className="text-xs text-slate-500">No active sessions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-800">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">IP</th>
                  <th className="py-2 pr-3 font-medium">Started</th>
                  <th className="py-2 pr-3 font-medium">Expires</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.active_sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-2 pr-3 text-slate-200">{s.username}</td>
                    <td className="py-2 pr-3 text-slate-400 font-mono">{s.ip_address ?? "—"}</td>
                    <td className="py-2 pr-3 text-slate-400">{formatDateTime(s.created_at)}</td>
                    <td className="py-2 pr-3 text-slate-400">{formatDateTime(s.expires_at)}</td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => handleRevoke(s.id)}
                        disabled={revokingId === s.id}
                        className="text-[10.5px] text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-lg px-2 py-1 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      >
                        {revokingId === s.id ? "Revoking…" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Recent login activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3 font-medium">Email attempted</th>
                <th className="py-2 pr-3 font-medium">Result</th>
                <th className="py-2 pr-3 font-medium">IP</th>
                <th className="py-2 pr-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.login_activity.map((a) => (
                <tr key={a.id} className="border-b border-slate-800/60 last:border-0">
                  <td className="py-2 pr-3 text-slate-200 font-mono">{a.email_attempted}</td>
                  <td className="py-2 pr-3">
                    <span className={a.success ? "text-emerald-400" : "text-rose-400"}>
                      {a.success ? "success" : a.failure_reason ?? "failed"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-400 font-mono">{a.ip_address ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-400">{formatDateTime(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
