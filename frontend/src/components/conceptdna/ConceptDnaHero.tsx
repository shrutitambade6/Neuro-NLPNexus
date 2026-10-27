import { Dna } from "lucide-react";

import type { ConceptSummary } from "../../services/api";

// Spec section 4 — the hero + summary counts. Every number here is
// `summary.*` straight off the backend's ConceptDnaResponse (see
// app/algorithms/concept_dna.py's docstring) — nothing here is a
// hardcoded placeholder number.
export default function ConceptDnaHero({ summary }: { summary: ConceptSummary }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gradient-to-br from-nexus-purple/20 to-nexus-accent/20 p-2.5 shrink-0">
          <Dna size={22} className="text-nexus-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold">Concept DNA</h1>
          <p className="text-sm text-nexus-muted mt-0.5">Your learning knowledge graph</p>
          <p className="text-sm text-nexus-muted mt-2 max-w-2xl">
            See how your concepts connect, where your understanding is strong, and what you should
            learn next.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryStat value={summary.total_concepts} label="Concepts" />
        <SummaryStat value={summary.strong} label="Strong" accent="text-nexus-good" />
        <SummaryStat value={summary.developing} label="Developing" accent="text-nexus-gold" />
        <SummaryStat value={summary.needs_attention} label="Need Attention" accent="text-nexus-bad" />
        <SummaryStat value={summary.cross_domain_connections} label="Cross-Domain Links" accent="text-nexus-accent" />
      </div>
    </div>
  );
}

function SummaryStat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-nexus-border bg-nexus-surface p-3 text-center">
      <p className={`text-2xl font-semibold ${accent ?? "text-nexus-text"}`}>{value}</p>
      <p className="text-[11px] text-nexus-muted mt-0.5">{label}</p>
    </div>
  );
}
