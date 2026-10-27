import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, MailQuestion } from "lucide-react";

import NexiMascot, { type NexiMood } from "../components/nexi/NexiMascot";
import { resendVerificationEmail, verifyEmailToken } from "../services/api";

type Status = "checking" | "success" | "error" | "missing-token";

/**
 * Destination of the real "Verify Email / Activate Account" link the
 * backend puts in the welcome email (see auth_service._build_verify_url).
 * This page owns the whole verification round trip: it calls the real
 * GET /api/auth/verify-email endpoint with the token from the URL — there
 * is no client-side "looks verified" shortcut, the backend is the source
 * of truth for is_verified.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>(token ? "checking" : "missing-token");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "done">("idle");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    verifyEmailToken(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("success");
        setMessage(res.message);
      })
      .catch((e) => {
        if (cancelled) return;
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setStatus("error");
        setMessage(detail ?? "This verification link is invalid or has expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendState("sending");
    try {
      const res = await resendVerificationEmail(resendEmail);
      setResendMessage(res.message);
    } catch {
      setResendMessage("Couldn't reach the backend — please try again in a moment.");
    } finally {
      setResendState("done");
    }
  };

  const mood: NexiMood = status === "success" ? "success" : status === "checking" ? "thinking" : "mistake";

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <div className="flex items-center gap-3">
        <NexiMascot mood={mood} size="md" />
        <div>
          <h1 className="text-2xl font-semibold">Email verification</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
        {status === "checking" && (
          <div className="flex items-center gap-2 text-sm text-nexus-muted">
            <Loader2 size={16} className="animate-spin" /> Verifying your email against the real backend…
          </div>
        )}

        {status === "missing-token" && (
          <div className="flex items-start gap-2 text-sm text-nexus-bad">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              This page needs a verification token — open it from the "Verify Email / Activate Account" link in
              your welcome email.
            </span>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-nexus-good">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 w-full"
            >
              Go to dashboard
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-nexus-bad">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>

            <div className="border-t border-nexus-border pt-4 space-y-2">
              <p className="text-xs text-nexus-muted flex items-center gap-1.5">
                <MailQuestion size={13} /> Need a new link? Enter your email to request one.
              </p>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(ev) => setResendEmail(ev.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                />
                <button
                  type="submit"
                  disabled={resendState === "sending"}
                  className="rounded-lg bg-nexus-accent px-3 py-2 text-xs font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 whitespace-nowrap"
                >
                  {resendState === "sending" ? <Loader2 size={13} className="animate-spin" /> : "Resend"}
                </button>
              </form>
              {resendMessage && <p className="text-xs text-nexus-muted">{resendMessage}</p>}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-nexus-muted">
        <Link to="/login" className="text-nexus-accent hover:text-nexus-data">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
