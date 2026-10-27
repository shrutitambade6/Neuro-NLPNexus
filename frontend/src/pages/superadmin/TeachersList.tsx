import { Check, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import StatusBadge from "../../components/superadmin/StatusBadge";
import {
  approveSuperAdminTeacherRequest,
  createSuperAdminTeacher,
  fetchSuperAdminTeacherRequests,
  fetchSuperAdminTeachers,
  rejectSuperAdminTeacherRequest,
  type SuperAdminTeacherRequest,
  type SuperAdminTeacherSummary,
} from "../../services/api";
import { formatDate } from "../../utils/formatDate";

// Student/Teacher self-serve signup follow-up (2026-10-07). A "request" is
// a role="student" account that picked "Teacher" at signup (Register.tsx)
// -- approving one here is the only path anywhere in the app that turns a
// publicly-registered account into a real role="admin" teacher account.
// Deliberately its own small section rather than folded into the table
// below: a pending request isn't a teacher yet, and the existing table's
// columns (assigned domain, last active, etc.) don't apply to it.
function TeacherRequestsSection({ onDecided }: { onDecided: () => void }) {
  const [requests, setRequests] = useState<SuperAdminTeacherRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainByRequest, setDomainByRequest] = useState<Record<number, "" | "nlp" | "dl">>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchSuperAdminTeacherRequests()
      .then((res) => setRequests(res.requests))
      .catch(() => setError("Couldn't load pending teacher requests."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const approve = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await approveSuperAdminTeacherRequest(id, domainByRequest[id] || null);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onDecided();
    } catch {
      setError("Couldn't approve that request.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await rejectSuperAdminTeacherRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Couldn't reject that request.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <h2 className="text-xs font-semibold text-amber-300">
        Teacher requests awaiting approval ({requests.length})
      </h2>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="space-y-2">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
          >
            <div>
              <p className="text-xs font-medium text-slate-100">{r.username}</p>
              {/* Username/Password Authentication milestone (2026-10-07)
                  -- most accounts now have no email on file; lead with
                  full name when present, fall back to just the date. */}
              <p className="text-[11px] text-slate-500">
                {r.full_name ? `${r.full_name} · ` : ""}requested {formatDate(r.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={domainByRequest[r.id] ?? ""}
                onChange={(e) =>
                  setDomainByRequest((prev) => ({ ...prev, [r.id]: e.target.value as "" | "nlp" | "dl" }))
                }
                disabled={busyId === r.id}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-indigo-400"
              >
                <option value="">Domain: both</option>
                <option value="nlp">NLP</option>
                <option value="dl">Deep Learning</option>
              </select>
              <button
                onClick={() => approve(r.id)}
                disabled={busyId === r.id}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white text-[11px] font-medium px-2.5 py-1.5 transition-colors disabled:opacity-50"
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={() => reject(r.id)}
                disabled={busyId === r.id}
                className="flex items-center gap-1 rounded-lg border border-slate-700 hover:border-rose-400 hover:text-rose-400 text-slate-300 text-[11px] font-medium px-2.5 py-1.5 transition-colors disabled:opacity-50"
              >
                <X size={12} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateTeacherModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [domain, setDomain] = useState<"" | "nlp" | "dl">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createSuperAdminTeacher({ username, email, password, assigned_domain: domain || null });
      onCreated();
      onClose();
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Couldn't create that teacher account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-slate-100">New teacher account</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="space-y-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            minLength={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Temporary password (min 8 characters)"
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as "" | "nlp" | "dl")}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Assigned domain: both / unspecified</option>
            <option value="nlp">NLP</option>
            <option value="dl">Deep Learning</option>
          </select>
        </div>

        <p className="text-[10.5px] text-slate-500">
          Share this password with the teacher through a secure channel — it isn't emailed
          automatically, and it won't be shown again after this.
        </p>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-500/90 hover:bg-indigo-500 text-white text-xs font-medium py-2 transition-colors disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create teacher account"}
        </button>
      </form>
    </div>
  );
}

export default function TeachersList() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<SuperAdminTeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSuperAdminTeachers()
      .then((res) => setTeachers(res.teachers))
      .catch(() => setError("Couldn't reach the backend, or this account isn't the Super Admin account."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <TeacherRequestsSection onDecided={load} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-semibold text-lg text-slate-100">Teachers ({teachers.length})</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-xs text-white bg-indigo-500/90 hover:bg-indigo-500 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Plus size={13} /> New teacher
        </button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-slate-500">No teacher accounts yet.</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="py-2.5 px-3 font-medium">Teacher</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Assigned domain</th>
                <th className="py-2.5 px-3 font-medium">Registered</th>
                <th className="py-2.5 px-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/super-admin/teachers/${t.id}`)}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <p className="text-slate-100 font-medium flex items-center gap-1.5">
                      {t.username}
                      {t.is_online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />}
                    </p>
                    {t.full_name && <p className="text-slate-500">{t.full_name}</p>}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={t.account_status} />
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 capitalize">{t.assigned_domain ?? "Both"}</td>
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(t.created_at)}</td>
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(t.last_login)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTeacherModal onCreated={load} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
