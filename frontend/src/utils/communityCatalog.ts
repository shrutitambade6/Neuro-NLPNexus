import type { Domain } from "../services/api";

// Mirrors backend/app/algorithms/community_catalog.py field-for-field —
// the frontend's topic dropdowns and filter chips are never a second,
// drifting copy of the real catalog, just a render of the same shape the
// backend already validates against. default_module_id, when set, is a
// real progress_catalog module_id, so a route is always just `/${id}`.

export const DOMAIN_ACCENT: Record<Domain, { text: string; bg: string; border: string; label: string }> = {
  // Reuses the exact purple/gold convention already established for NLP
  // vs DL in DomainBarChart/DomainAnalytics (Teacher Dashboard milestone)
  // — "subtle distinct accent colors," not a new palette invented here.
  nlp: { text: "text-nexus-purple", bg: "bg-nexus-purple/10", border: "border-nexus-purple/30", label: "NLP" },
  dl: { text: "text-nexus-gold", bg: "bg-nexus-gold/10", border: "border-nexus-gold/30", label: "Deep Learning" },
};

export function moduleRoute(moduleId: string | null): string | null {
  return moduleId ? `/${moduleId}` : null;
}
