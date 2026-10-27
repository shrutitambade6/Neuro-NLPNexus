import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { useAuthStore } from "../store/authStore";
import FluidCursorBackground from "../components/FluidCursorBackground";
import NexiMascot from "../components/nexi/NexiMascot";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  // Username/Password Authentication milestone (2026-10-07) -- login is by
  // username + password now, no email anywhere on this page. See
  // student-teacher-username-auth.md.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Student/Teacher self-serve signup follow-up (2026-10-07). This is a
  // REAL check, not cosmetic -- the backend rejects a correct password on
  // the wrong tab (see auth_service.login_user's _account_type_matches),
  // so a "Teacher" selection only ever succeeds for an actual role="admin"
  // or role="super_admin" account. Defaults to "student" since that's the
  // overwhelmingly common case, matching Register.tsx's own default.
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    // Every account lands on /dashboard after signing in, regardless of
    // role (user feedback 2026-10-07) -- admin/super-admin accounts can
    // still reach their own /admin or /super-admin portal from the nav,
    // this only changes where sign-in itself drops them off.
    const ok = await login(username, password, accountType);
    if (ok) navigate("/dashboard");
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      {/* Fluid cursor trail (user spec, 2026-10-07) -- scoped to just
          Home and this sign-in page; see the matching comment in
          Home.tsx for why it's mounted locally per-page rather than
          once in App.tsx. */}
      <FluidCursorBackground />
      {/* User feedback 2026-10-07: the technical "passwords are hashed
          with PBKDF2-HMAC-SHA256..." subtext was removed -- a real
          product's sign-in page doesn't explain its own backend
          implementation to the visitor; it just signs them in. The
          backend behavior itself (hashing, JWT sessions) is completely
          unchanged, only this descriptive line is gone. */}
      <div className="flex items-center gap-3">
        <NexiMascot mood={error ? "mistake" : "waving"} size="md" />
        <h1 className="text-2xl font-semibold">Sign in</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
        <div>
          <label className="text-xs text-nexus-muted">I'm signing in as a</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["student", "teacher"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccountType(type)}
                aria-pressed={accountType === type}
                className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  accountType === type
                    ? "border-nexus-accent bg-nexus-accent/15 text-nexus-accent"
                    : "border-nexus-border bg-nexus-bg text-nexus-muted hover:text-nexus-text"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Username</label>
          <input
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          {/* Username/Password Authentication milestone (2026-10-07) --
              the "Forgot password?" link is removed from this page: a
              username-only account has no email to send a reset link to,
              so there is no self-service recovery path anymore. The
              backend's email-based forgot/reset-password endpoints still
              exist and still work for any account that does have an email
              on file; a locked-out username-only account now goes through
              a Super Admin instead (Account Actions panel). */}
          <label className="text-xs text-nexus-muted">Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-nexus-text"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
          Sign in
        </button>
      </form>

      <p className="text-center text-xs text-nexus-muted">
        Don't have an account?{" "}
        <Link to="/register" className="text-nexus-accent hover:text-nexus-data">
          Create one
        </Link>
      </p>
    </div>
  );
}
