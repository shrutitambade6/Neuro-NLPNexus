// Study Planner color registry (2026-10-07). Category colors are the
// dataviz skill's validated 6-hue categorical set (same order as the
// reference palette: violet/blue/aqua/orange/yellow/magenta), each one
// theme-reactive via the --nexus-planner* CSS vars added in index.css --
// see those vars' own comments for the validation details. "slate" is
// deliberately NOT part of that validated set: it's the neutral
// "uncategorized" fallback, reusing --nexus-muted, since a single neutral
// bucket never has to be told apart from a real category.
import { nexusVar } from "./theme";
import type { PlannerPriority } from "../services/plannerApi";

export interface PlannerColorMeta {
  key: string;
  label: string;
  dotClass: string;
  chipClass: string; // soft background + text + border, for category chips/pills
  chartColor: string; // resolved CSS color string for Recharts fills
}

function meta(key: string, label: string, token: string): PlannerColorMeta {
  return {
    key,
    label,
    dotClass: `bg-nexus-${token}`,
    chipClass: `bg-nexus-${token}/15 text-nexus-${token} border-nexus-${token}/30`,
    chartColor: nexusVar(token),
  };
}

export const PLANNER_CATEGORY_META: Record<string, PlannerColorMeta> = {
  lavender: meta("lavender", "Lavender", "plannerLavender"),
  sky: meta("sky", "Sky", "plannerSky"),
  mint: meta("mint", "Mint", "plannerMint"),
  coral: meta("coral", "Coral", "plannerCoral"),
  butter: meta("butter", "Butter", "plannerButter"),
  rose: meta("rose", "Rose", "plannerRose"),
  slate: meta("slate", "Slate", "muted"),
};

export const PLANNER_CATEGORY_COLOR_ORDER = ["lavender", "sky", "mint", "coral", "butter", "rose", "slate"] as const;

export function plannerCategoryMeta(color: string | null | undefined): PlannerColorMeta {
  return PLANNER_CATEGORY_META[color ?? "slate"] ?? PLANNER_CATEGORY_META.slate;
}

export interface PlannerPriorityMeta {
  label: string;
  dotClass: string;
  textClass: string;
  chipClass: string;
}

export const PLANNER_PRIORITY_META: Record<PlannerPriority, PlannerPriorityMeta> = {
  low: { label: "Low", dotClass: "bg-nexus-good", textClass: "text-nexus-good", chipClass: "bg-nexus-good/15 text-nexus-good border-nexus-good/30" },
  medium: { label: "Medium", dotClass: "bg-nexus-warn", textClass: "text-nexus-warn", chipClass: "bg-nexus-warn/15 text-nexus-warn border-nexus-warn/30" },
  high: { label: "High", dotClass: "bg-nexus-bad", textClass: "text-nexus-bad", chipClass: "bg-nexus-bad/15 text-nexus-bad border-nexus-bad/30" },
};

export const PLANNER_STATUS_META: Record<string, { label: string; textClass: string; dotClass: string }> = {
  todo: { label: "To do", textClass: "text-nexus-muted", dotClass: "bg-nexus-muted" },
  working: { label: "In progress", textClass: "text-nexus-accent", dotClass: "bg-nexus-accent" },
  done: { label: "Done", textClass: "text-nexus-good", dotClass: "bg-nexus-good" },
};
