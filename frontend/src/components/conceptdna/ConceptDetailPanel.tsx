import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Dumbbell, Network, X } from "lucide-react";

import type { ConceptState } from "../../services/api";
import { STATUS_BADGE_CLASSES, STATUS_DOT, STATUS_LABEL } from "./conceptDnaTheme";

interface Props {
  concept: ConceptState;
  allConcepts: ConceptState[];
  onSelectConcept: (id: string) => void;
  onClose: () => void;
}

// Spec point 7 — the detail panel opened by clicking a node. Every field
// here already arrived in the one /api/concept-dna payload (no per-click
// network request), and every button navigates to a REAL existing route
// (concept.route — see backend/app/algorithms/concept_catalog.py, which
// only ever points at real pages) — never a fabricated one.
export default function ConceptDetailPanel({ concept, allConcepts, onSelectConcept, onClose }: Props) {
  const byId = new Map(allConcepts.map((c) => [c.id, c]));
  const prerequisites = concept.prerequisite_ids.map((id) => byId.get(id)).filter((c): c is ConceptState => !!c);
  const connected = concept.related_ids.map((id) => byId.get(id)).filter((c): c is ConceptState => !!c);

  // "Recommended Next" within the panel (point 7's example) — the first
  // related concept this student hasn't started yet, if any; a smaller,
  // local echo of the page-level recommendation, scoped to this concept.
  const nextUp = connected.find((c) => c.status === "not_started");

  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-nexus-muted">{concept.domain === "nlp" ? "NLP" : "Deep Learning"}</p>
          <h2 className="text-lg font-display font-semibold">{concept.label}</h2>
        </div>
        <button onClick={onClose} className="text-nexus-muted hover:text-nexus-text transition-colors" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <p className="text-sm text-nexus-muted">{concept.description}</p>

      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[concept.status]}`}>
          {STATUS_DOT[concept.status]} {STATUS_LABEL[concept.status]}
        </span>
        {concept.status !== "locked" && concept.status !== "not_started" && (
          <span className="text-xs text-nexus-muted">Understanding: <span className="font-semibold text-nexus-text">{concept.mastery_score}%</span></span>
        )}
      </div>

      {concept.status === "locked" && prerequisites.length > 0 && (
        <p className="text-xs text-nexus-muted rounded-lg border border-dashed border-nexus-border p-2.5">
          Locked until you complete: {prerequisites.map((p) => p.label).join(", ")}.
        </p>
      )}

      {prerequisites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-nexus-muted mb-1">Prerequisites</p>
          <div className="flex flex-wrap gap-1.5">
            {prerequisites.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectConcept(p.id)}
                className="rounded-full border border-nexus-border bg-nexus-surfaceAlt px-2.5 py-1 text-xs hover:border-nexus-accentDim transition-colors"
              >
                {STATUS_DOT[p.status]} {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {connected.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-nexus-muted mb-1">Connected Concepts</p>
          <div className="flex flex-wrap gap-1.5">
            {connected.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectConcept(c.id)}
                className="rounded-full border border-nexus-border bg-nexus-surfaceAlt px-2.5 py-1 text-xs hover:border-nexus-accentDim transition-colors"
              >
                {STATUS_DOT[c.status]} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(concept.completed || concept.quiz_attempts > 0 || concept.challenge_attempts > 0) && (
        <div>
          <p className="text-xs font-semibold text-nexus-muted mb-1">Your Activity</p>
          <ul className="text-xs text-nexus-text space-y-0.5">
            <li>{concept.completed ? "1" : "0"} lesson completed</li>
            {concept.quiz_attempts > 0 && (
              <li>
                {concept.quiz_attempts} quiz attempt{concept.quiz_attempts !== 1 ? "s" : ""} — average score{" "}
                {Math.round(concept.quiz_average_score ?? 0)}%
              </li>
            )}
            {concept.challenge_attempts > 0 && (
              <li>
                {concept.challenge_attempts} challenge attempt{concept.challenge_attempts !== 1 ? "s" : ""} — {concept.challenge_correct} correct
              </li>
            )}
          </ul>
        </div>
      )}

      {nextUp && (
        <div className="rounded-lg border border-nexus-accentDim/40 bg-nexus-accent/5 p-2.5">
          <p className="text-xs text-nexus-muted">Recommended Next</p>
          <p className="text-sm font-medium">{nextUp.label}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to={concept.route}
          className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-nexus-accent/90 transition-colors"
        >
          <BookOpen size={13} /> Study Concept
        </Link>
        <Link
          to={concept.route}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-xs font-medium hover:border-nexus-accentDim transition-colors"
        >
          <Dumbbell size={13} /> Practice
        </Link>
        {connected.length > 0 && (
          <button
            onClick={() => onSelectConcept(connected[0].id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-xs font-medium hover:border-nexus-accentDim transition-colors"
          >
            <Network size={13} /> View Related <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
