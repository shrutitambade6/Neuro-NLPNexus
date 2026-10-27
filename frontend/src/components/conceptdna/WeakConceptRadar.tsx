import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import type { WeakConcept } from "../../services/api";

// Spec point 10 — "⚠️ NEEDS ATTENTION." Only ever renders concepts the
// backend scored "needs_attention" from REAL activity (see
// concept_dna.py's compute_concept_dna — a concept with zero activity is
// "not started," never listed here). If there simply isn't enough real
// data yet, this shows the spec's own honest fallback copy rather than
// an empty list that could read as "nothing is wrong."
export default function WeakConceptRadar({ weakConcepts, onSelect }: { weakConcepts: WeakConcept[]; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-4 space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5 text-nexus-bad">
        <AlertTriangle size={14} /> Needs Attention
      </p>

      {weakConcepts.length === 0 ? (
        <p className="text-xs text-nexus-muted">Not enough activity yet to determine weaknesses.</p>
      ) : (
        <div className="space-y-2.5">
          {weakConcepts.map((w) => (
            <div key={w.id} className="rounded-lg border border-nexus-bad/25 bg-nexus-bad/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => onSelect(w.id)} className="text-sm font-medium text-left hover:underline">
                  {w.label}
                </button>
                <span className="text-xs text-nexus-bad shrink-0">{w.mastery_score}%</span>
              </div>
              <ul className="mt-1 text-[11px] text-nexus-muted space-y-0.5">
                {w.reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
              <Link
                to={w.route}
                className="inline-block mt-1.5 text-[11px] font-medium text-nexus-bad hover:underline"
              >
                Review {w.label} →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
