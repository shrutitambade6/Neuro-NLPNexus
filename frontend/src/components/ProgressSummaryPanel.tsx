import { Activity, Award, CheckCircle2, Flame, Layers, Lock, Trophy } from "lucide-react";

import ProgressStatCard from "./ProgressStatCard";
import { BADGE_CATALOG, type BadgeCatalogEntry } from "../utils/badgeCatalog";
import type { ActivityItem, MySummary } from "../services/api";

// The real "NLP Progress | DL Progress | Completed Tasks | Quiz Scores |
// Badges | Learning Streak" summary, plus Badges + Recent Activity below
// it — shared by the Profile page (pages/Profile.tsx) and the dedicated
// /progress page (pages/Progress.tsx), both reading the exact same
// /api/progress/my-summary response via progressStore rather than two
// implementations that could drift apart.
//
// "Remove the Progress button from the UI" pass: this used to also render
// inside a header "Progress" popup (ProgressModal.tsx), capped at 640px
// wide. That popup and its trigger button have been removed entirely —
// this panel's only homes now are the full-width Profile and /progress
// pages — but the grid below stays capped at 3 columns (2 rows of 3)
// rather than reverting to the original 6-column row, since that's still
// the more readable layout at any width.
const ACTIVITY_ICON: Record<string, { Icon: typeof CheckCircle2; accent: string }> = {
  lesson_complete: { Icon: CheckCircle2, accent: "text-nexus-good" },
  lab_complete: { Icon: CheckCircle2, accent: "text-nexus-good" },
  badge_earned: { Icon: Award, accent: "text-nexus-gold" },
  quiz_attempt: { Icon: Trophy, accent: "text-nexus-data" },
};

function activityIconFor(item: ActivityItem) {
  return ACTIVITY_ICON[item.activity_type] ?? { Icon: CheckCircle2, accent: "text-nexus-muted" };
}

function BadgeSlot({ entry, earned }: { entry: BadgeCatalogEntry; earned: boolean }) {
  const Icon = entry.icon;
  return (
    <div
      className={`rounded-xl border p-3 flex items-start gap-3 ${
        earned ? "border-nexus-border bg-nexus-surfaceAlt" : "border-nexus-border/60 bg-nexus-surface/40"
      }`}
    >
      <div
        className={`rounded-lg p-2 shrink-0 ${
          earned
            ? {
                good: "bg-nexus-good/10",
                purple: "bg-nexus-purple/10",
                gold: "bg-nexus-gold/10",
                data: "bg-nexus-data/10",
                accent: "bg-nexus-accent/10",
                coral: "bg-nexus-coral/10",
              }[entry.accent]
            : "bg-nexus-surfaceAlt"
        }`}
      >
        {earned ? (
          <Icon
            size={16}
            className={
              {
                good: "text-nexus-good",
                purple: "text-nexus-purple",
                gold: "text-nexus-gold",
                data: "text-nexus-data",
                accent: "text-nexus-accent",
                coral: "text-nexus-coral",
              }[entry.accent]
            }
          />
        ) : (
          <Lock size={16} className="text-nexus-muted" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${earned ? "text-nexus-text" : "text-nexus-muted"}`}>
          {entry.label}
          {!earned && <span className="ml-1.5 text-[10px] font-normal text-nexus-muted/70">Locked</span>}
        </p>
        <p className="text-[11px] text-nexus-muted/80 mt-0.5 leading-snug">{entry.description}</p>
      </div>
    </div>
  );
}

export default function ProgressSummaryPanel({ summary, activityLimit = 5 }: { summary: MySummary; activityLimit?: number }) {
  const earnedKeys = new Set(summary.badges.map((b) => b.key));

  return (
    <div className="space-y-5 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ProgressStatCard
          label="NLP Progress"
          value={`${summary.nlp_progress.percentage}%`}
          icon={Layers}
          accent="purple"
          progress={summary.nlp_progress}
        />
        <ProgressStatCard
          label="Deep Learning Progress"
          value={`${summary.dl_progress.percentage}%`}
          icon={Layers}
          accent="gold"
          progress={summary.dl_progress}
        />
        <ProgressStatCard
          label="Completed Tasks"
          value={summary.completed_tasks}
          icon={Activity}
          accent="accent"
          hint="Lessons & labs marked complete"
        />
        <ProgressStatCard
          label="Quiz Scores"
          value={summary.average_quiz_score != null ? `${summary.average_quiz_score}%` : "—"}
          icon={Trophy}
          accent="data"
          hint={`${summary.quiz_attempts} attempt${summary.quiz_attempts === 1 ? "" : "s"}`}
        />
        <ProgressStatCard
          label="Badges Earned"
          value={summary.badges.length}
          icon={Award}
          accent="good"
          hint="Earned from real progress"
        />
        <ProgressStatCard label="Learning Streak" value="0 days" icon={Flame} accent="coral" hint="Not tracked yet" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4 min-w-0">
          <p className="text-xs font-medium text-nexus-muted mb-3">Badges</p>
          <div className="space-y-2">
            {BADGE_CATALOG.map((entry) => (
              <BadgeSlot key={entry.key} entry={entry} earned={earnedKeys.has(entry.key)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4 min-w-0">
          <p className="text-xs font-medium text-nexus-muted mb-3">Recent Activity</p>
          {summary.recent_activity.length === 0 ? (
            <p className="text-xs text-nexus-muted leading-relaxed">
              No learning activity yet.
              <br />
              Start your first lesson to see your progress here.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {summary.recent_activity.slice(0, activityLimit).map((a, i) => {
                const { Icon, accent } = activityIconFor(a);
                return (
                  <li key={i} className="flex items-start gap-2.5">
                    <Icon size={14} className={`${accent} mt-0.5 shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-nexus-text truncate">{a.detail ?? a.activity_type}</p>
                      <p className="text-[10px] text-nexus-muted font-mono mt-0.5">
                        {new Date(a.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
