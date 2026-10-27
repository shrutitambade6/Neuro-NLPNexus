import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

import type { ConceptRecommendation } from "../../services/api";

// Spec point 11 — "NEXT RECOMMENDED." The reason text is generated
// server-side from real prerequisite/completion data (see
// concept_dna.py's _recommend_next) — never a template filled with
// invented concept names. recommendation is null when there's genuinely
// nothing honest to suggest yet (e.g. everything reachable has already
// been started) — same "don't manufacture analytics" rule as the radar.
export default function RecommendedNext({ recommendation, onSelect }: { recommendation: ConceptRecommendation | null; onSelect: (id: string) => void }) {
  if (!recommendation || !recommendation.concept_id) {
    return (
      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-1">
          <Sparkles size={14} className="text-nexus-accent" /> Next Recommended
        </p>
        <p className="text-xs text-nexus-muted">
          Keep working through the graph — once you've unlocked a new concept, we'll recommend it here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-nexus-accentDim/40 bg-gradient-to-br from-nexus-accent/10 to-nexus-purple/10 p-4 space-y-2">
      <p className="text-xs font-semibold text-nexus-muted flex items-center gap-1.5">
        <Sparkles size={13} className="text-nexus-accent" /> NEXT RECOMMENDED
      </p>
      <button onClick={() => onSelect(recommendation.concept_id!)} className="block text-left">
        <p className="text-lg font-display font-semibold hover:underline">{recommendation.label}</p>
      </button>
      <p className="text-xs text-nexus-muted">{recommendation.reason}</p>
      {recommendation.route && (
        <Link
          to={recommendation.route}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-nexus-accent hover:underline"
        >
          Learn {recommendation.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
