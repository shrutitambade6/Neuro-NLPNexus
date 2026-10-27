// Birthday Experience milestone — a handful of literal Tailwind class
// strings shared across the birthday/* components. Literal (never
// template-concatenated) for the same reason utils/bookAccents.ts's
// classes are literal: Tailwind's JIT scanner only sees whole class-name
// substrings in the source text, so a runtime-built `` bg-nexus-${x} ``
// would silently never ship any CSS.
//
// Point 6 of the spec: "noticeably different... but must NOT destroy the
// existing dark navy/blue/purple-NLP/orange-DL design." Every one of
// these borrows the app's own existing tokens (nexus-accent/purple/gold/
// coral) rather than introducing new hardcoded hex birthday colors, so
// the celebration layer always matches whatever theme (dark/light) is
// active instead of fighting it.
export const BIRTHDAY_GRADIENT_TEXT =
  "bg-gradient-to-r from-nexus-purple via-nexus-accent to-nexus-gold bg-clip-text text-transparent";

export const BIRTHDAY_BADGE_CLASSES =
  "inline-flex items-center gap-1.5 rounded-full border border-nexus-gold/40 bg-nexus-gold/10 px-2.5 py-1 text-[11px] font-medium text-nexus-gold";

export const BIRTHDAY_RING_GLOW_SHADOW = "0 0 0 2px rgb(var(--nexus-gold) / 0.55), 0 0 22px 2px rgb(var(--nexus-purple) / 0.45)";

export const BIRTHDAY_PANEL_CLASSES =
  "rounded-2xl border border-nexus-gold/25 bg-gradient-to-br from-nexus-surface via-nexus-surface to-nexus-purple/10";
