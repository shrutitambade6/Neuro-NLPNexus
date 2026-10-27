import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Cake, CheckCircle2, Eye, EyeOff, KeyRound, LogOut, Loader2, Trash2 } from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";
import { useAuthStore } from "../store/authStore";
import { useDomainStore } from "../store/domainStore";
import { useBirthday } from "../hooks/useBirthday";
import { usePreferencesStore, type TooltipTrigger } from "../store/preferencesStore";
import { changePassword } from "../services/api";

// Redesign Stage 2, spec point 4: a dedicated Settings page, replacing a
// scattered set of controls with four real sections. The spec's original
// wording said this should "replace home-page theme controls" — this app's
// Home page never actually had one (the only existing theme control is
// TopBar's compact Light/Dark/System toggle), so nothing was removed
// there; this page gives Appearance a fuller, explained home alongside the
// other three sections rather than duplicating a control that doesn't
// exist elsewhere.
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-xs text-nexus-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("The new password and confirmation don't match.");
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await changePassword(currentPassword, newPassword);
      setMessage(res.message);
      setState("done");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMessage(detail ?? "Couldn't reach the backend — please try again in a moment.");
      setState("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <label className="text-xs text-nexus-muted">Current password</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <div>
        <label className="text-xs text-nexus-muted">New password (min. 8 characters)</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <div>
        <label className="text-xs text-nexus-muted">Confirm new password</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>

      {state === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-3 py-2 text-xs text-nexus-bad">
          <AlertCircle size={14} className="shrink-0" /> {message}
        </div>
      )}
      {state === "done" && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-good/40 bg-nexus-good/10 px-3 py-2 text-xs text-nexus-good">
          <CheckCircle2 size={14} className="shrink-0" /> {message}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
      >
        {state === "sending" ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
        Change password
      </button>
    </form>
  );
}

// Point 22 of the Birthday Experience spec: Settings -> Account & Privacy
// gets a Birthday field, masked/hidden by default, with add/change/remove
// — removing it is what actually turns the whole feature off for this
// account (useBirthday().isBirthdayToday immediately follows, since it's
// recomputed from this same value server-side on every load).
function BirthdaySettingsField() {
  const { myBirthday, setMyBirthday } = useBirthday();
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(myBirthday?.birthday ?? "");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  const detectedTimezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  // The date input's `max` must be "today" in the BROWSER'S OWN local
  // calendar day, never UTC (Birthday Experience point 4: timezone-aware,
  // local calendar day, never blind UTC). `new Date().toISOString()` is
  // always UTC, so for anyone west-of-UTC-midnight-but-already-tomorrow-
  // locally (e.g. India, UTC+5:30, for several hours around UTC midnight)
  // that old computation under-capped `max` to "yesterday" in their own
  // calendar, which could make the native date picker flag a correctly-
  // chosen "today" as out of range. Built from local Date getters instead,
  // so it always matches the device's own clock, not the server's/UTC's.
  const todayLocalISO = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const startEditing = () => {
    setDraft(myBirthday?.birthday ?? "");
    setEditing(true);
    setState("idle");
  };

  const save = async () => {
    setState("saving");
    try {
      await setMyBirthday(draft || null, detectedTimezone);
      setEditing(false);
      setState("idle");
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setMessage(detail ?? "Couldn't save your birthday — please try again.");
      setState("error");
    }
  };

  const remove = async () => {
    setState("saving");
    try {
      await setMyBirthday(null);
      setEditing(false);
      setRevealed(false);
      setState("idle");
    } catch {
      setMessage("Couldn't remove your birthday — please try again.");
      setState("error");
    }
  };

  return (
    <div className="max-w-sm pt-4 border-t border-nexus-border">
      <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
        <Cake size={14} className="text-nexus-gold" /> Birthday
      </p>
      <p className="text-[11px] text-nexus-muted mb-2">
        Your birthday is used to personalize your NeuroNLP Nexus experience. Other users will only see
        that today is your birthday — your full date of birth remains private.
      </p>

      {!editing ? (
        <div className="flex items-center gap-2 text-sm">
          {myBirthday?.birthday ? (
            <>
              <span>
                {revealed
                  ? new Date(myBirthday.birthday).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "•••• •• ••"}
              </span>
              <button
                onClick={() => setRevealed((r) => !r)}
                className="text-nexus-accent hover:text-nexus-data"
                aria-label={revealed ? "Hide birthday" : "Show birthday"}
              >
                {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={startEditing} className="text-xs text-nexus-accent hover:underline ml-1">
                Change
              </button>
              <button onClick={remove} className="text-xs text-nexus-bad hover:underline inline-flex items-center gap-1 ml-1">
                <Trash2 size={12} /> Remove
              </button>
            </>
          ) : (
            <>
              <span className="text-nexus-muted">Not set — optional</span>
              <button onClick={startEditing} className="text-xs text-nexus-accent hover:underline ml-1">
                Add birthday
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draft}
            max={todayLocalISO}
            onChange={(e) => setDraft(e.target.value)}
            className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
          <button
            onClick={save}
            disabled={state === "saving"}
            className="rounded-lg bg-nexus-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-nexus-muted hover:text-nexus-text">
            Cancel
          </button>
        </div>
      )}

      {state === "error" && <p className="mt-1.5 text-xs text-nexus-bad">{message}</p>}
    </div>
  );
}

const TOOLTIP_OPTIONS: { value: TooltipTrigger; label: string; hint: string }[] = [
  { value: "hover-click", label: "Hover or click", hint: "Definitions appear on hover/focus, and stay open if you click." },
  { value: "click-only", label: "Click only", hint: "Nothing appears until you click a term — better for touch devices." },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const domain = useDomainStore((s) => s.domain);
  const setDomain = useDomainStore((s) => s.setDomain);
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion);
  const largeText = usePreferencesStore((s) => s.largeText);
  const setLargeText = usePreferencesStore((s) => s.setLargeText);
  const tooltipTrigger = usePreferencesStore((s) => s.tooltipTrigger);
  const setTooltipTrigger = usePreferencesStore((s) => s.setTooltipTrigger);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-nexus-muted text-sm mt-1">Appearance, account security, learning preferences, and accessibility.</p>
      </div>

      <SectionCard title="Appearance" description="Switch instantly — no reload. System follows your OS and keeps following it live.">
        <ThemeToggle />
      </SectionCard>

      <SectionCard title="Account & Security">
        {user ? (
          <div className="space-y-5">
            {/* College Email milestone (2026-10-08) -- signup now collects a
                full set of identifying details (account type, full name,
                college email, username); showing all of them here gives the
                student/teacher a single place to confirm exactly what they
                signed up with, for their own reference. Password is
                deliberately never shown back. */}
            <div className="grid grid-cols-2 gap-4 text-sm max-w-sm">
              <div>
                <p className="text-xs text-nexus-muted">Account Type</p>
                <p className="mt-0.5">
                  {user.role === "admin" ? "Teacher" : user.role === "super_admin" ? "Super Admin" : "Student"}
                  {user.teacher_request_pending && (
                    <span className="ml-1.5 text-[11px] text-nexus-gold">(approval pending)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Username</p>
                <p className="mt-0.5">{user.username}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Full Name</p>
                <p className="mt-0.5 truncate">{user.full_name ?? user.username}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">College Email</p>
                {/* Pre-college-email accounts (created before 2026-10-08)
                    have no email on file -- show that honestly rather than
                    a blank. */}
                <p className="mt-0.5 truncate">{user.email ?? "Not on file"}</p>
              </div>
            </div>
            <p className="text-[11px] text-nexus-muted/80">
              Changing your username or full name isn't supported yet. You can change your password below.
            </p>
            <BirthdaySettingsField />
            <ChangePasswordForm />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-sm text-nexus-muted hover:text-nexus-bad hover:border-nexus-bad/40 transition-colors"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        ) : (
          <p className="text-sm text-nexus-muted">
            <Link to="/login" className="text-nexus-accent hover:text-nexus-data">
              Sign in
            </Link>{" "}
            to manage your account.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Learning Preferences"
        description="Real settings that change how the app behaves right now — nothing here is decorative."
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-1.5">Preferred domain</p>
            <p className="text-xs text-nexus-muted mb-2">Which lab area to lead with — you can still switch anytime from the top bar.</p>
            <div className="inline-flex rounded-lg border border-nexus-border bg-nexus-bg p-0.5">
              {(["nlp", "dl"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    domain === d ? "bg-nexus-accent/15 text-nexus-text" : "text-nexus-muted hover:text-nexus-text"
                  }`}
                >
                  {d === "nlp" ? "NLP" : "Deep Learning"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Term tooltips</p>
            <p className="text-xs text-nexus-muted mb-2">How the glossary cards on technical terms (like this one) open.</p>
            <div className="space-y-1.5">
              {TOOLTIP_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="tooltip-trigger"
                    checked={tooltipTrigger === opt.value}
                    onChange={() => setTooltipTrigger(opt.value)}
                    className="mt-0.5 accent-nexus-accent"
                  />
                  <span>
                    {opt.label}
                    <span className="block text-[11px] text-nexus-muted">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Accessibility" description="Both apply immediately, app-wide, and are remembered on this device.">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 max-w-sm cursor-pointer">
            <span>
              <span className="text-sm">Reduce motion</span>
              <span className="block text-[11px] text-nexus-muted">
                Cuts CSS transitions/animations to near-zero duration, on top of your OS setting if you have one.
              </span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="h-4 w-4 accent-nexus-accent shrink-0"
            />
          </label>
          <label className="flex items-center justify-between gap-4 max-w-sm cursor-pointer">
            <span>
              <span className="text-sm">Larger text</span>
              <span className="block text-[11px] text-nexus-muted">Scales body text and headings up app-wide.</span>
            </span>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className="h-4 w-4 accent-nexus-accent shrink-0"
            />
          </label>
        </div>
      </SectionCard>
    </div>
  );
}
