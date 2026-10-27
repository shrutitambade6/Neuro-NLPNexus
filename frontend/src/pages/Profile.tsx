import { Link } from "react-router-dom";
import { ArrowRight, Calendar, IdCard, ShieldCheck, Sparkles, User } from "lucide-react";

import ProgressSummaryPanel from "../components/ProgressSummaryPanel";
import { useAuthStore } from "../store/authStore";
import { useDomainStore } from "../store/domainStore";
import { useProgressStore } from "../store/progressStore";

// Redesign Stage 2, spec point 3: a dedicated My Profile page. Personal
// account info (top card) is kept visibly separate from learning stats
// (ProgressSummaryPanel below) — same real data as the Dashboard/Progress
// modal/`/progress` page, no auth internals (password hash, raw JWT, etc.)
// ever shown here, only what UserOut/AuthUser actually expose.
export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const domain = useDomainStore((s) => s.domain);
  const summary = useProgressStore((s) => s.summary);
  // Birthday Experience milestone — this page no longer shows anything
  // birthday-related (2026-10-07 change, per the user's own request): no
  // date field, no star badge, no avatar glow, no "Birthday Today" line.
  // The feature itself is untouched elsewhere (Dashboard greeting, chat,
  // teacher view, Settings add/change/remove) — this is Profile-only.

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-3">
        <p className="text-nexus-muted text-sm">Sign in to see your profile.</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
        >
          Sign in <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-nexus-muted text-sm mt-1">Your account, and a snapshot of your real learning progress.</p>
      </div>

      <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-start gap-4">
          <div className="h-[52px] w-[52px] rounded-full bg-nexus-accent/15 p-3 shrink-0 flex items-center justify-center">
            <User size={22} className="text-nexus-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-semibold">{user.username}</p>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {/* Username/Password Authentication milestone (2026-10-07) -- this
                  used to show user.email; signup no longer collects one, so
                  Full Name (the identity field signup collects instead) is
                  shown here. Falls back to the username itself for the
                  handful of pre-existing accounts that predate this column
                  and have no full_name on file. */}
              <div className="flex items-center gap-2 text-nexus-muted">
                <IdCard size={14} className="shrink-0" />
                <span className="truncate">{user.full_name ?? user.username}</span>
              </div>
              <div className="flex items-center gap-2 text-nexus-muted">
                <Calendar size={14} className="shrink-0" />
                <span>
                  Joined {new Date(user.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-nexus-muted">
                <ShieldCheck size={14} className="shrink-0" />
                <span>{user.role === "admin" ? "Teacher / admin account" : "Student account"}</span>
              </div>
              <div className="flex items-center gap-2 text-nexus-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-nexus-accent shrink-0" />
                <span>Currently focused on {domain === "nlp" ? "NLP" : "Deep Learning"}</span>
              </div>
            </div>
          </div>
          <Link
            to="/settings"
            className="shrink-0 text-xs text-nexus-accent hover:text-nexus-data whitespace-nowrap"
          >
            Edit in Settings →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Learning Stats</h2>
        {summary ? (
          <ProgressSummaryPanel summary={summary} activityLimit={8} />
        ) : (
          <p className="text-sm text-nexus-muted">Loading your real progress…</p>
        )}
      </section>

      {/* "Behind the Nexus" (2026-10-08 user spec, section 21): a
          subtle entry point into the platform's final storytelling
          chapter -- deliberately placed here rather than as a new
          sidebar item, per the spec's own explicit instruction not to
          add a prominent new nav entry. */}
      <Link
        to="/behind-the-nexus"
        className="group flex items-center justify-between rounded-2xl border border-nexus-border bg-nexus-surface p-5 transition-colors hover:border-nexus-accent"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nexus-accent/15">
            <Sparkles size={18} className="text-nexus-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-nexus-text">Behind the Nexus</p>
            <p className="text-xs text-nexus-muted">The people and the story behind this platform.</p>
          </div>
        </div>
        <ArrowRight size={16} className="shrink-0 text-nexus-muted transition-colors group-hover:text-nexus-accent" />
      </Link>
    </div>
  );
}
