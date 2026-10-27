import { Link } from "react-router-dom";
import { ArrowRight, Dna } from "lucide-react";

// Spec point 17 — new students with little/no learning data see this
// instead of a graph full of honest-but-alarming zeroes. has_any_activity
// comes straight from the backend (concept_dna.py), so this only shows
// when there's genuinely nothing real to visualize yet.
export default function EmptyConceptDna() {
  return (
    <div className="max-w-md mx-auto mt-10 text-center space-y-3 rounded-2xl border border-dashed border-nexus-border bg-nexus-surface/60 p-8">
      <div className="inline-flex rounded-xl bg-gradient-to-br from-nexus-purple/20 to-nexus-accent/20 p-3">
        <Dna size={24} className="text-nexus-accent" />
      </div>
      <h2 className="font-display font-semibold text-lg">Your Concept DNA is still forming.</h2>
      <p className="text-sm text-nexus-muted">
        Complete a few lessons and quizzes to start building your knowledge map.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 transition-colors"
      >
        Start Learning <ArrowRight size={14} />
      </Link>
    </div>
  );
}
