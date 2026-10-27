import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

import NexiMascot from "../components/nexi/NexiMascot";
import { forgotPassword } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setState("done");
    } catch {
      setMessage("Couldn't reach the backend — please try again in a moment.");
      setState("error");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <div className="flex items-center gap-3">
        <NexiMascot mood={state === "done" ? "success" : state === "error" ? "mistake" : "thinking"} size="md" />
        <div>
          <h1 className="text-2xl font-semibold">Forgot your password?</h1>
          <p className="text-nexus-muted text-sm mt-1">
            Enter your account email — if it matches a real account, we'll send a real reset link
            (valid for 1 hour) through the backend's configured email service.
          </p>
        </div>
      </div>

      {state !== "done" ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
          <div>
            <label className="text-xs text-nexus-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {state === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Send reset link
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
          <div className="flex items-start gap-2 text-sm text-nexus-good">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{message}</span>
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
