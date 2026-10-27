// Concept DNA milestone — literal Tailwind class strings per node/edge
// state. Literal (never template-concatenated), same reason as
// utils/bookAccents.ts / components/ParseTreeGraph.tsx's own COLOR_CLASSES:
// Tailwind's JIT content scanner only sees whole class-name substrings in
// the source text, so a runtime-built `` fill-nexus-${x} `` would
// silently ship no CSS for it.
import type { ConceptStatus } from "../../services/api";

export const STATUS_LABEL: Record<ConceptStatus, string> = {
  strong: "Strong",
  developing: "Developing",
  needs_attention: "Needs Attention",
  not_started: "Not Started",
  locked: "Locked",
};

// A small emoji/dot marker alongside every status label — point 19/28:
// "never rely only on animation/color to communicate state." Every place
// a status renders, it renders WITH this label/dot, never a bare color.
export const STATUS_DOT: Record<ConceptStatus, string> = {
  strong: "🟢",
  developing: "🟡",
  needs_attention: "🔴",
  not_started: "⚪",
  locked: "🔒",
};

export const STATUS_NODE_CLASSES: Record<ConceptStatus, { fill: string; fillSoft: string; stroke: string; text: string }> = {
  strong: { fill: "fill-nexus-good", fillSoft: "fill-nexus-good/15", stroke: "stroke-nexus-good", text: "text-nexus-good" },
  developing: { fill: "fill-nexus-gold", fillSoft: "fill-nexus-gold/15", stroke: "stroke-nexus-gold", text: "text-nexus-gold" },
  needs_attention: { fill: "fill-nexus-bad", fillSoft: "fill-nexus-bad/15", stroke: "stroke-nexus-bad", text: "text-nexus-bad" },
  not_started: { fill: "fill-nexus-muted", fillSoft: "fill-nexus-surfaceAlt", stroke: "stroke-nexus-muted", text: "text-nexus-muted" },
  locked: { fill: "fill-nexus-border", fillSoft: "fill-nexus-surfaceAlt", stroke: "stroke-nexus-border", text: "text-nexus-muted" },
};

export const STATUS_BADGE_CLASSES: Record<ConceptStatus, string> = {
  strong: "border-nexus-good/40 bg-nexus-good/10 text-nexus-good",
  developing: "border-nexus-gold/40 bg-nexus-gold/10 text-nexus-gold",
  needs_attention: "border-nexus-bad/40 bg-nexus-bad/10 text-nexus-bad",
  not_started: "border-nexus-border bg-nexus-surfaceAlt text-nexus-muted",
  locked: "border-nexus-border bg-nexus-surfaceAlt text-nexus-muted",
};

export const DOMAIN_ACCENT: Record<"nlp" | "dl", string> = {
  nlp: "text-nexus-purple",
  dl: "text-nexus-gold",
};

export const CROSS_DOMAIN_STROKE = "stroke-nexus-accent";
