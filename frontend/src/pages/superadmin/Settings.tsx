import { Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchSuperAdminSettings, type SuperAdminSettings as SettingsData } from "../../services/api";

function Row({ label, value }: { label: string; value: string | number | boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 font-mono">{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</span>
    </div>
  );
}

// Read-only by design — every value here is a live read of the real
// constant that actually enforces it (security_policy.py, moderation.py,
// admin_service.py), never a duplicated number that could silently drift
// from what the backend is really doing. Changing any of these means
// changing the source constant and redeploying, not editing a database
// row — deliberately so, for a platform's security posture.
export default function Settings() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuperAdminSettings()
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
    <div className="space-y-4 max-w-xl">
      <h1 className="font-display font-semibold text-lg text-slate-100">Settings</h1>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-start gap-2.5">
        <Lock size={15} className="text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-200/90">
          Confidential information — passwords, password hashes, authentication tokens, and
          session secrets — is never exposed through this portal, anywhere, under any role.
          Every sensitive action a Super Admin takes is written to the immutable Audit Log.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Authentication</h2>
        <Row label="Password hashing" value={`PBKDF2-HMAC-SHA256, ${data.pbkdf2_iterations.toLocaleString()} iterations`} />
        <Row label="Standard session lifetime" value={`${data.session_lifetime_hours} hours`} />
        <Row label="Super Admin session lifetime" value={`${data.super_admin_session_lifetime_hours} hours`} />
        <Row label="Email delivery configured" value={data.email_delivery_configured} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Rate limiting</h2>
        <Row label="Login attempts" value={`${data.login_rate_limit_max_attempts} per ${data.login_rate_limit_window_minutes} min`} />
        <Row
          label="Chat / discussion actions"
          value={`${data.chat_rate_limit_max_actions} per ${data.chat_rate_limit_window_seconds}s`}
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-semibold text-slate-200 mb-2">Platform thresholds</h2>
        <Row label="Needs-attention: stale after" value={`${data.needs_attention_stale_days} days`} />
        <Row label="Needs-attention: low progress below" value={`${data.needs_attention_low_progress_pct}%`} />
        <Row label="Quiz pass score" value={`${data.quiz_pass_score}%`} />
      </div>
    </div>
  );
}
