import type { CrossDomainHighlight } from "../../services/api";

// Spec section 9 — "Your Cross-Domain Connections." Each highlight here
// is one of concept_catalog.py's small, hand-curated set of genuine
// NLP<->DL bridges, and only appears once the student has real activity
// on the NLP side of that specific bridge (see concept_dna.py's
// _cross_domain_highlights) — never every incidental NLP/DL pair.
export default function CrossDomainPanel({ highlights }: { highlights: CrossDomainHighlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-nexus-accent/25 bg-nexus-accent/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-nexus-accent">Your Cross-Domain Connections</p>
      <div className="space-y-2.5">
        {highlights.map((h, i) => (
          <div key={i} className="text-xs">
            <p className="font-mono text-nexus-text">{h.path_labels.join(" → ")}</p>
            <p className="text-nexus-muted mt-0.5">{h.narrative}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
