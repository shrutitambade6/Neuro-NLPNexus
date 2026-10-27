// Storytelling-UI pass (2026-10-07, sections 15/16 of the user's "turn the
// whole site into an interactive universe" spec) — the shared mapping
// between a real route and the student's current "chapter" in the story
// (DISCOVER -> LEARN -> EXPERIMENT -> CONNECT -> UNDERSTAND), used by
// <StoryProgressIndicator>.
//
// IMPORTANT, read before extending this file: this first pass builds only
// the opening cinematic + universe reveal + this indicator FRAMEWORK (per
// the user's own scoping decision, 2026-10-07) — it does NOT yet build the
// nine narrative "chapters" the full spec describes (a storified Library,
// a storified Playground, a storified Concept DNA reveal, etc.). The
// mapping below is a reasonable first-pass assignment of each EXISTING
// page to the phase it already most resembles, so the indicator has
// something real to show from day one and future chapter work has a
// framework to plug into — it is not itself a redesign of those pages.
// A page with no entry below renders no indicator at all (section 15's
// "normal navigation remains available, untouched" — settings, community,
// teacher/admin/super-admin areas deliberately stay outside the story).
export type StoryPhase = "discover" | "learn" | "experiment" | "connect" | "understand";

export const STORY_PHASES: ReadonlyArray<{ key: StoryPhase; label: string }> = [
  { key: "discover", label: "Discover" },
  { key: "learn", label: "Learn" },
  { key: "experiment", label: "Experiment" },
  { key: "connect", label: "Connect" },
  { key: "understand", label: "Understand" },
];

// Checked in order, by prefix — specific-enough routes only, so this never
// silently claims a page (e.g. /messages, /community/*, /admin/*,
// /super-admin/*, /settings) that the spec never asked to be part of the
// story.
const ROUTE_PHASE_MAP: ReadonlyArray<{ prefix: string; phase: StoryPhase }> = [
  { prefix: "/concept-dna", phase: "connect" },
  { prefix: "/model-comparison", phase: "understand" },
  { prefix: "/progress", phase: "understand" },
  { prefix: "/profile", phase: "understand" },
  { prefix: "/resources", phase: "learn" },
  { prefix: "/nlp-learning-hub", phase: "learn" },
  { prefix: "/dl-foundations", phase: "learn" },
  { prefix: "/dl-module-1", phase: "learn" },
  { prefix: "/dl-module-2", phase: "learn" },
  { prefix: "/dl-module-3", phase: "learn" },
  { prefix: "/dashboard", phase: "discover" },
  { prefix: "/foundations", phase: "discover" },
  { prefix: "/playground", phase: "experiment" },
  { prefix: "/preprocessing", phase: "experiment" },
  { prefix: "/pos-tagging", phase: "experiment" },
  { prefix: "/parsing", phase: "experiment" },
  { prefix: "/semantics", phase: "experiment" },
  { prefix: "/discourse", phase: "experiment" },
  { prefix: "/language-modeling", phase: "experiment" },
  { prefix: "/neural-networks", phase: "experiment" },
  { prefix: "/cnn-lab", phase: "experiment" },
  { prefix: "/rnn-lstm-lab", phase: "experiment" },
  { prefix: "/attention-transformers", phase: "experiment" },
  { prefix: "/applications", phase: "experiment" },
  { prefix: "/dl-applications", phase: "experiment" },
];

export function getStoryPhaseForPath(pathname: string): StoryPhase | null {
  const hit = ROUTE_PHASE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  return hit ? hit.phase : null;
}
