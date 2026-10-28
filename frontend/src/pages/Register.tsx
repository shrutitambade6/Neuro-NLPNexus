import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Mail, UserPlus, X } from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { checkUsernameAvailable, resendVerificationEmail } from "../services/api";
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

// Production-Ready Email Verification milestone (2026-10-28). Mirrors the
// backend's GENERAL_EMAIL_PROVIDERS (schemas.auth.py) -- a General
// student may register with a personal address from one of these instead
// of the institutional domain. Teachers never see this choice; the
// backend forces them onto COLLEGE_EMAIL_DOMAIN regardless either way.
const GENERAL_EMAIL_DOMAIN = "gmail.com";
const GENERAL_EMAIL_PATTERN = new RegExp(`^[^\\s@]+@${GENERAL_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`, "i");

// Masks an email's local part for privacy-conscious display on the
// "check your inbox" screen (spec section 11) -- never shows the full
// address back, just enough for the user to recognize it's theirs.
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const hidden = "*".repeat(Math.max(local.length - visible.length, 3));
  return `${visible}${hidden}@${domain}`;
}

type UsernameCheck = "idle" | "checking" | "available" | "taken" | "invalid";
type StudentCategory = "vit" | "general";

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
  // Production-Ready Email Verification milestone (2026-10-28). Only
  // meaningful for students -- see validate_email_domain's own comment
  // server-side. Reset to "vit" whenever accountType switches to
  // "teacher" (see the account-type toggle's onClick below), purely for
  // UI consistency; the backend enforces the real rule independently.
  const [studentCategory, setStudentCategory] = useState<StudentCategory>("vit");
  const [toast, setToast] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  // Production-Ready Email Verification milestone (2026-10-28). Set once
  // register() resolves to "verify_pending" -- a brand-new account that
  // was created but issued NO session, because it still has to verify
  // its email. Replaces the form with the "check your inbox" screen
  // below instead of ever navigating into the dashboard.
  const [pendingVerification, setPendingVerification] = useState<{ active: boolean; email: string }>({
    active: false,
    email: "",
  });
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendMessage, setResendMessage] = useState("");
  const strength = useMemo(() => passwordStrength(password), [password]);
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  // Production-Ready Email Verification milestone (2026-10-28). A
  // teacher, or a "vit"-category student, is still required to use the
  // institutional domain; a "general" student may use a personal Gmail
  // address instead -- mirrors schemas.auth.RegisterRequest.
  // validate_email_domain exactly, so the frontend never promises an
  // address the backend will then reject.
  const requiresCollegeDomain = accountType === "teacher" || studentCategory === "vit";
  const activeEmailPattern = requiresCollegeDomain ? COLLEGE_EMAIL_PATTERN : GENERAL_EMAIL_PATTERN;
  const emailLabel = requiresCollegeDomain ? "College Email" : "Personal Email (Gmail)";
  const emailPlaceholder = `yourname@${requiresCollegeDomain ? COLLEGE_EMAIL_DOMAIN : GENERAL_EMAIL_DOMAIN}`;
  const emailHint = requiresCollegeDomain
    ? `Must be your college email, ending in @${COLLEGE_EMAIL_DOMAIN}`
    : `Must be a personal email ending in @${GENERAL_EMAIL_DOMAIN}`;
  const collegeEmailInvalid = collegeEmail.length > 0 && !activeEmailPattern.test(collegeEmail.trim());

  // Fixes the cross-page error leak (Login.tsx <-> Register.tsx share one
  // `error` field in the auth store, see authStore.ts): a failed login
  // attempt's "Username not found." must never still be showing here if
  // the visitor then navigates to this page without having submitted
  // this form yet.
  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!activeEmailPattern.test(collegeEmail.trim())) return;
    const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    const trimmedEmail = collegeEmail.trim();
    const result = await register(
      username,
      fullName,
      trimmedEmail,
      password,
      confirmPassword,
      null,
      timezone,
      accountType,
      studentCategory
    );
    if (result === "authenticated") {
      const { user } = useAuthStore.getState();
      setToast({ active: true, message: successMessage(user?.teacher_request_pending ?? false) });
      // Give the toast a moment on screen before leaving the page it
      // appeared on — long enough to read, short enough not to feel stuck.
      setTimeout(() => navigate("/dashboard"), 1900);
    } else if (result === "verify_pending") {
      // Production-Ready Email Verification milestone (2026-10-28). No
      // session was issued -- replace the form with the "check your
      // inbox" screen rather than navigating anywhere. See spec section
      // 11, item 4 ("Verification email sent") / item 10 ("Do not
      // redirect users into the dashboard before their account has been
      // properly verified").
      setPendingVerification({ active: true, email: trimmedEmail });
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    setResendMessage("");
    try {
      const result = await resendVerificationEmail(pendingVerification.email);
      setResendState(result.email_status === "rate_limited" || result.email_status === "disabled" ? "error" : "sent");
      setResendMessage(result.message);
    } catch {
      setResendState("error");
      setResendMessage("Couldn't reach the backend. Please try again in a moment.");
    }
  };

  if (pendingVerification.active) {
    // Production-Ready Email Verification milestone (2026-10-28). The
    // account was created but is NOT logged in -- there is no session,
    // and this page must never navigate into the dashboard from here.
    // Matches spec section 11's required copy/shape for this state.
    return (
      <div className="max-w-sm mx-auto mt-12 space-y-6">
        <div className="flex items-center gap-3">
          <NexiMascot mood="success" size="md" />
          <h1 className="text-2xl font-semibold">Almost there</h1>
        </div>
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Mail size={18} className="shrink-0 text-nexus-accent mt-0.5" />
            <p className="text-nexus-text">
              Your account is almost ready. We've sent a verification link to{" "}
              <span className="font-medium">{maskEmail(pendingVerification.email)}</span>. Open the email and
              verify your account before logging in.
            </p>
          </div>
          <p className="text-xs text-nexus-muted">
            The link expires in 24 hours. If it doesn't arrive in a few minutes, check your spam folder or
            request a new one below.
          </p>

          {resendMessage && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                resendState === "error"
                  ? "border-nexus-bad/40 bg-nexus-bad/10 text-nexus-bad"
                  : "border-nexus-good/40 bg-nexus-good/10 text-nexus-good"
              }`}
            >
              {resendState === "error" ? (
                <AlertCircle size={14} className="shrink-0" />
              ) : (
                <Check size={14} className="shrink-0" />
              )}
              {resendMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === "sending"}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-nexus-border bg-nexus-bg px-4 py-2 text-sm font-medium text-nexus-text hover:text-nexus-accent disabled:opacity-50"
          >
            {resendState === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            Resend verification email
          </button>

          <Link
            to="/login"
            className="block text-center text-xs text-nexus-accent hover:text-nexus-data"
          >
            Already verified? Sign in
          </Link>
        </div>
      </div>
    );
  }

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
                onClick={() => {
                  setAccountType(type);
                  // Production-Ready Email Verification milestone
                  // (2026-10-28) -- teachers never get a category choice;
                  // the backend forces them onto the institutional domain
                  // regardless, so keep the UI consistent with that.
                  if (type === "teacher") setStudentCategory("vit");
                }}
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
        {accountType === "student" && (
          <div>
            <label className="text-xs text-nexus-muted">Student category</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["vit", "general"] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setStudentCategory(category)}
                  aria-pressed={studentCategory === category}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    studentCategory === category
                      ? "border-nexus-accent bg-nexus-accent/15 text-nexus-accent"
                      : "border-nexus-border bg-nexus-bg text-nexus-muted hover:text-nexus-text"
                  }`}
                >
                  {category === "vit" ? "VIT Student" : "General Student"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-nexus-muted">
              {studentCategory === "vit"
                ? `Use your @${COLLEGE_EMAIL_DOMAIN} institutional email below.`
                : `No VIT email? Use your personal @${GENERAL_EMAIL_DOMAIN} address below.`}
            </p>
          </div>
        )}
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
          <label className="text-xs text-nexus-muted">{emailLabel}</label>
          <input
            required
            type="email"
            placeholder={emailPlaceholder}
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
          {collegeEmailInvalid && <p className="mt-1.5 text-[10px] text-nexus-bad">{emailHint}</p>}
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
