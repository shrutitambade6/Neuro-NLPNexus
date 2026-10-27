import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";

import NexiMascot from "../components/nexi/NexiMascot";
import { resetPassword } from "../services/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setState("sending");
    try {
      const res = await resetPassword(token, password);
      setMessage(res.message);
      setState("done");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMessage(detail ?? "Couldn't reach the backend — please try again in a moment.");
      setState("error");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <div className="flex items-center gap-3">
        <NexiMascot mood={state === "done" ? "success" : state === "error" ? "mistake" : "thinking"} size="md" />
        <div>
          <h1 className="text-2xl font-semibold">Reset your password</h1>
        </div>
      </div>

      {!token ? (
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-2 text-sm text-nexus-bad flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            This page needs a reset token — open it from the "Reset Password" link in your email, or request a
            new one from the{" "}
            <Link to="/forgot-password" className="text-nexus-accent hover:text-nexus-data">
              forgot password
            </Link>{" "}
            page.
          </span>
        </div>
      ) : state !== "done" ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
          <div>
            <label className="text-xs text-nexus-muted">New password (min. 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            />
          </div>

          {state === "error" && (
            <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad">
              <AlertCircle size={14} className="shrink-0" /> {message}
            </div>
          )}

          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            {state === "sending" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Reset password
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
          <div className="flex items-start gap-2 text-sm text-nexus-good">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{message} Redirecting you to sign in…</span>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-nexus-muted">
        <Link to="/login" className="text-nexus-accent hover:text-nexus-data">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
