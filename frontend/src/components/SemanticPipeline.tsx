import { useState } from "react";
import { motion } from "framer-motion";

const STAGES = [
  { id: "word", label: "Word", detail: "A word on its own is just a string — semantics starts by asking what it could mean." },
  { id: "sense", label: "Sense", detail: "Most words have multiple senses (meanings) — 'bank' as a financial institution vs. a riverbank." },
  { id: "relation", label: "Relation", detail: "Words relate to each other structurally: synonymy, hypernymy, meronymy, and more." },
  { id: "context", label: "Context", detail: "Surrounding words narrow down which sense is intended — the basis of word sense disambiguation." },
  { id: "similarity", label: "Similarity", detail: "Words and documents can be compared numerically: Jaccard, cosine, TF-IDF." },
  { id: "knowledge", label: "Knowledge", detail: "Facts about the world can be captured as a graph of entities and relations." },
  { id: "meaning", label: "Meaning", detail: "All of the above combine to let a system approximate what language actually refers to." },
];

export default function SemanticPipeline() {
  const [active, setActive] = useState(STAGES[0].id);
  const current = STAGES.find((s) => s.id === active)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-nexus-muted">→</span>}
            <motion.button
              onClick={() => setActive(stage.id)}
              whileTap={{ scale: 0.97 }}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                active === stage.id
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                  : "border-nexus-border bg-nexus-surface text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {stage.label}
            </motion.button>
          </div>
        ))}
      </div>
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-nexus-border bg-nexus-surface p-4 text-sm text-nexus-muted"
      >
        <span className="text-nexus-text font-medium">{current.label}: </span>
        {current.detail}
      </motion.div>
    </div>
  );
}
