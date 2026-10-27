import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { nexusVar } from "../utils/theme";

export type StatAccent = "purple" | "gold" | "accent" | "data" | "good" | "coral";

// Literal class strings per accent — see KnowledgeMap.tsx's ACCENT_STYLES
// for why these must be written out in full rather than built with
// `bg-nexus-${accent}`: Tailwind's JIT scanner reads this file as text, so
// a class name assembled at runtime is invisible to it and silently emits
// no CSS.
const ACCENT_STYLES: Record<StatAccent, { bgSoft: string; text: string; barBg: string }> = {
  purple: { bgSoft: "bg-nexus-purple/10", text: "text-nexus-purple", barBg: "bg-nexus-purple" },
  gold: { bgSoft: "bg-nexus-gold/10", text: "text-nexus-gold", barBg: "bg-nexus-gold" },
  accent: { bgSoft: "bg-nexus-accent/10", text: "text-nexus-accent", barBg: "bg-nexus-accent" },
  data: { bgSoft: "bg-nexus-data/10", text: "text-nexus-data", barBg: "bg-nexus-data" },
  good: { bgSoft: "bg-nexus-good/10", text: "text-nexus-good", barBg: "bg-nexus-good" },
  coral: { bgSoft: "bg-nexus-coral/10", text: "text-nexus-coral", barBg: "bg-nexus-coral" },
};

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accent: StatAccent;
  /** Real completed/total/percentage — when present, renders an animated fill bar under the number instead of just the hint line. Never pass a fabricated percentage. */
  progress?: { percentage: number; completed: number; total: number };
}

// Purpose-built stat card for the Progress modal/page only (see
// ProgressSummaryPanel.tsx) — NOT a replacement for the shared
// components/StatCard.tsx, which Dashboard/Teacher/SuperAdmin pages still
// use unchanged. This one adds the per-metric accent color and the
// optional animated progress bar the redesigned Progress UI calls for,
// without changing how any other page's stat tiles look.
export default function ProgressStatCard({ label, value, icon: Icon, hint, accent, progress }: Props) {
  const reduceMotion = useReducedMotion();
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 flex flex-col gap-2 min-w-0">
      <div className={`rounded-lg p-2 w-fit ${styles.bgSoft}`}>
        <Icon size={18} className={styles.text} />
      </div>

      <p className="text-2xl font-semibold leading-tight text-nexus-text font-mono">{value}</p>
      <p className="text-xs font-medium text-nexus-text">{label}</p>

      {progress ? (
        <div className="space-y-1 mt-0.5">
          <div className="h-1.5 rounded-full bg-nexus-border overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: nexusVar(accent) }}
              initial={reduceMotion ? false : { width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="text-[11px] text-nexus-muted/80">
            {progress.completed} / {progress.total} lessons
          </p>
        </div>
      ) : (
        hint && <p className="text-[11px] text-nexus-muted/80">{hint}</p>
      )}
    </div>
  );
}
