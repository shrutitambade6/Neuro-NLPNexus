// Literal Tailwind class strings for the two accent pairs the Interactive
// Learning Books use (NLP = purple + blue, Deep Learning = gold + data/
// electric-blue) — the same colors already used everywhere else in the app
// for these two domains (Sidebar's domain headers, KnowledgeMap, Progress).
//
// Kept as a literal Record (never built via runtime string concatenation
// or `.replace(...)`), because Tailwind's JIT content scanner reads this
// file as plain TEXT: a class name assembled at runtime is invisible to it
// and silently emits no CSS. Same pattern already established in
// KnowledgeMap.tsx / DomainChoiceCards.tsx for the identical reason.
export type BookAccentToken = "purple" | "gold" | "accent" | "data";

export interface BookAccentClasses {
  text: string;
  border: string;
  bgSoft: string;
  bgSofter: string;
  // Full literal "hover:bg-nexus-*/20" strings — kept as their own field
  // (never built by concatenating "hover:" with bgSofter at runtime,
  // which is invisible to Tailwind's JIT scanner — see the file header).
  hoverBgSofter: string;
  solidBg: string;
  ring: string;
}

export const BOOK_ACCENT_CLASSES: Record<BookAccentToken, BookAccentClasses> = {
  purple: {
    text: "text-nexus-purple",
    border: "border-nexus-purple",
    bgSoft: "bg-nexus-purple/10",
    bgSofter: "bg-nexus-purple/20",
    hoverBgSofter: "hover:bg-nexus-purple/20",
    solidBg: "bg-nexus-purple",
    ring: "focus-visible:ring-nexus-purple",
  },
  accent: {
    text: "text-nexus-accent",
    border: "border-nexus-accent",
    bgSoft: "bg-nexus-accent/10",
    bgSofter: "bg-nexus-accent/20",
    hoverBgSofter: "hover:bg-nexus-accent/20",
    solidBg: "bg-nexus-accent",
    ring: "focus-visible:ring-nexus-accent",
  },
  gold: {
    text: "text-nexus-gold",
    border: "border-nexus-gold",
    bgSoft: "bg-nexus-gold/10",
    bgSofter: "bg-nexus-gold/20",
    hoverBgSofter: "hover:bg-nexus-gold/20",
    solidBg: "bg-nexus-gold",
    ring: "focus-visible:ring-nexus-gold",
  },
  data: {
    text: "text-nexus-data",
    border: "border-nexus-data",
    bgSoft: "bg-nexus-data/10",
    bgSofter: "bg-nexus-data/20",
    hoverBgSofter: "hover:bg-nexus-data/20",
    solidBg: "bg-nexus-data",
    ring: "focus-visible:ring-nexus-data",
  },
};
