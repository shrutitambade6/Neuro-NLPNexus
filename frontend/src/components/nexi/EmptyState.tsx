import type { ReactNode } from "react";

import NexiMascot, { type NexiMood } from "./NexiMascot";

interface Props {
  title: string;
  description: string;
  mood?: NexiMood;
  action?: ReactNode;
  className?: string;
}

/**
 * A reusable "nothing here yet" state — NEXI + a friendly explanation +
 * an optional real CTA, instead of a bare "No data available." (spec #26).
 * Used for genuinely-empty states (no results, no history) and for modules
 * that simply aren't built yet (see PhasePlaceholder.tsx, which is this
 * component with mood="empty").
 */
export default function EmptyState({ title, description, mood = "empty", action, className }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-nexus-border rounded-2xl bg-nexus-surface/40 ${className ?? ""}`}
    >
      <NexiMascot mood={mood} size="lg" className="mb-4" />
      <h2 className="text-lg font-semibold text-nexus-text">{title}</h2>
      <p className="text-sm text-nexus-muted mt-2 max-w-md">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
