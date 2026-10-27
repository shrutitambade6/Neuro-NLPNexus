import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Loader2, UserPlus, X } from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { checkUsernameAvailable } from "../services/api";
import NexiMascot, { type NexiMood } from "../components/nexi/NexiMascot";
import AccountCreatedToast from "../components/nexi/AccountCreatedToast";

// Username/Password Authentication milestone (2026-10-07) -- signup no
// longer collects or mentions email anywhere; see
// student-teacher-username-auth.md. Builds the toast copy purely from
// account state (teacher-approval pending or not), never from an email
// delivery outcome -- there is no email step in this flow anymore.
function successMessage(teacherRequestPending: boolean): string {
  if (teacherRequestPending) {
    return "🎉 Account created! Your teacher account request has been sent to the platform's Super Admin for approval — you can use NeuroNLP Nexus as a student right away in the meantime.";
  }
  return "🎉 Account created successfully! You're ready to go.";
}

// A real, simple strength heuristic (length + character variety) — not a
// cosmetic bar. NEXI's mood and the bar's fill both come from this same
// score, computed fresh from the actual password on every keystroke.
function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(score, 3) as 0 | 1 | 2 | 3;
  return { score: clamped, label: ["Too short", "Weak", "Good", "Strong"][clamped] };
}
const STRENGTH_MOOD: NexiMood[] = ["thinking", "mistake", "learning", "success"];
const STRENGTH_COLOR = ["bg-nexus-border", "bg-nexus-bad", "bg-nexus-warn", "bg-nexus-good"];

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

// College-email requirement (2026-10-08) — every student/teacher account
// is institutional. This is purely additive alongside the username+
// password milestone (2026-10-07): login is untouched, this only adds a
// second required, validated field at signup. Domain kept as one constant
// so it's a one-line change if a different college ever needs this build.
const COLLEGE_EMAIL_DOMAIN = "vit.edu.in";
const COLLEGE_EMAIL_PATTERN = new RegExp(`^[^\\s@]+@${COLLEGE_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`, "i");

type UsernameCheck = "idle" | "checking" | "available" | "taken" | "invalid";

export default function Register() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Student/Teacher self-serve signup follow-up (pre-existing). Picking
  // "Teacher" never grants teacher access directly -- see the explanatory
  // line rendered under the toggle below, and successMessage() above for
  // what the post-signup toast says. Defaults to "student" (today's
  // behavior) so this is purely additive for anyone who ignores it.
  const [accountType, setAccountType] = useState<"student" | "teacher">("student");
  const [toast, setToast] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  const strength = useMemo(() => passwordStrength(password), [password]);
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const collegeEmailInvalid = collegeEmail.length > 0 && !COLLEGE_EMAIL_PATTERN.test(collegeEmail.trim());

  // Real-time username availability (spec section 1) — debounced so every
  // keystroke doesn't fire a request; a request in flight is discarded if
  // the username changes again before it resolves (the `generation` ref
  // guards against a slow, stale response overwriting a newer one).
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>("idle");
  const checkGeneration = useRef(0);
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameCheck("idle");
      return;
    }
    if (trimmed.length < 3 || !USERNAME_PATTERN.test(trimmed)) {
      setUsernameCheck("invalid");
      return;
    }
    setUsernameCheck("checking");
    const generation = ++checkGeneration.current;
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(trimmed);
        if (checkGeneration.current === generation) {
          setUsernameCheck(result.available ? "available" : "taken");
        }
      } catch {
        if (checkGeneration.current === generation) setUsernameCheck("idle");
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    // Belt-and-suspenders alongside the disabled submit button below --
    // this guard is what actually matters for a keyboard Enter-submit
    // that fires before React's re-render has disabled the button.
    if (password !== confirmPassword) return;
    if (usernameCheck === "taken") return;
    if (!COLLEGE_EMAIL_PATTERN.test(collegeEmail.trim())) return;
    const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    const ok = await register(username, fullName, collegeEmail.trim(), password, confirmPassword, null, timezone, accountType);
    if (ok) {
      const { user } = useAuthStore.getState();
      setToast({ active: true, message: successMessage(user?.teacher_request_pending ?? false) });
      // Give the toast a moment on screen before leaving the page it
      // appeared on — long enough to read, short enough not to feel stuck.
      setTimeout(() => navigate("/dashboard"), 1900);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <AccountCreatedToast active={toast.active} message={toast.message} />
      {/* User feedback 2026-10-07 (same fix as Login.tsx): no technical
          subtext narrating backend implementation -- a real product's
          sign-up page doesn't explain what row it inserts. Nothing about
          what registration actually does changed. */}
      <div className="flex items-center gap-3">
        <NexiMascot mood={error ? "mistake" : password ? STRENGTH_MOOD[strength.score] : "waving"} size="md" />
        <h1 className="text-2xl font-semibold">Create an account</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
        <div>
          <label className="text-xs text-nexus-muted">I'm signing up as a</label>
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
          {accountType === "teacher" && (
            <p className="mt-1.5 text-[10px] text-nexus-muted">
              Teacher accounts need approval. You'll get full student access immediately, and a
              platform admin will review your request to unlock teacher tools.
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Full Name</label>
          <input
            required
            minLength={1}
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">College Email</label>
          <input
            required
            type="email"
            placeholder={`yourname@${COLLEGE_EMAIL_DOMAIN}`}
            autoCapitalize="none"
            autoCorrect="off"
            value={collegeEmail}
            onChange={(e) => setCollegeEmail(e.target.value)}
            aria-invalid={collegeEmailInvalid}
            className={`w-full mt-1 rounded-lg bg-nexus-bg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              collegeEmailInvalid
                ? "border-nexus-bad focus:ring-nexus-bad/50"
                : "border-nexus-border focus:ring-nexus-accent/50"
            }`}
          />
          {collegeEmailInvalid && (
            <p className="mt-1.5 text-[10px] text-nexus-bad">Must be your college email, ending in @{COLLEGE_EMAIL_DOMAIN}</p>
          )}
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Username</label>
          <div className="relative mt-1">
            <input
              required
              minLength={3}
              pattern="[A-Za-z0-9_]+"
              title="Letters, numbers, and underscores only"
              placeholder="Choose a unique username"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={usernameCheck === "taken" || usernameCheck === "invalid"}
              className={`w-full rounded-lg bg-nexus-bg border px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 ${
                usernameCheck === "taken"
                  ? "border-nexus-bad focus:ring-nexus-bad/50"
                  : usernameCheck === "available"
                    ? "border-nexus-good focus:ring-nexus-good/50"
                    : "border-nexus-border focus:ring-nexus-accent/50"
              }`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {usernameCheck === "checking" && <Loader2 size={13} className="animate-spin text-nexus-muted" />}
              {usernameCheck === "available" && <Check size={14} className="text-nexus-good" />}
              {usernameCheck === "taken" && <X size={14} className="text-nexus-bad" />}
            </span>
          </div>
          {usernameCheck === "available" && <p className="mt-1.5 text-[10px] text-nexus-good">Username available</p>}
          {usernameCheck === "taken" && <p className="mt-1.5 text-[10px] text-nexus-bad">Username already taken</p>}
          {usernameCheck === "invalid" && (
            <p className="mt-1.5 text-[10px] text-nexus-muted">At least 3 characters — letters, numbers, and underscores only.</p>
          )}
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Create Password (min. 8 characters)</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="Enter password"
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
          {password && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? STRENGTH_COLOR[strength.score] : "bg-nexus-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-nexus-muted whitespace-nowrap">{strength.label}</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Confirm Password</label>
          <div className="relative mt-1">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmMismatch}
              className={`w-full rounded-lg bg-nexus-bg border px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 ${
                confirmMismatch
                  ? "border-nexus-bad focus:ring-nexus-bad/50"
                  : "border-nexus-border focus:ring-nexus-accent/50"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-nexus-muted hover:text-nexus-text"
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {confirmMismatch && <p className="mt-1.5 text-[10px] text-nexus-bad">Passwords don't match</p>}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || confirmMismatch || usernameCheck === "taken" || collegeEmailInvalid || !collegeEmail}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Create Account
        </button>
      </form>

      <p className="text-center text-xs text-nexus-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-nexus-accent hover:text-nexus-data">
          Sign in
        </Link>
      </p>
    </div>
  );
}
