import { useState } from "react";
import { motion } from "framer-motion";

const STAGES = [
  { id: "lexical", label: "Lexical Analysis", detail: "Identifies words and looks them up against a lexicon/dictionary — the first pass over raw text." },
  { id: "morphological", label: "Morphological Analysis", detail: "Breaks words into meaningful units (prefixes, roots, suffixes) — e.g. 'unhappiness' → un + happy + ness." },
  { id: "syntactic", label: "Syntactic Analysis", detail: "Determines the grammatical structure of a sentence — which words group into phrases, and how those phrases relate." },
  { id: "semantic", label: "Semantic Analysis", detail: "Determines the literal meaning of words and sentences, resolving lexical/semantic ambiguity where possible." },
  { id: "discourse", label: "Discourse Analysis", detail: "Looks beyond a single sentence — resolving pronouns and tracking how sentences relate to each other." },
  { id: "pragmatic", label: "Pragmatic Analysis", detail: "Determines the speaker's real intent given context — e.g. reading a literal question as a polite request." },
];

export default function StagesPipeline() {
  const [active, setActive] = useState(STAGES[0].id);
  const current = STAGES.find((s) => s.id === active)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2 text-xs font-medium text-nexus-muted">
          Text
        </div>
        {STAGES.map((stage) => (
          <div key={stage.id} className="flex items-center gap-2">
            <span className="text-nexus-muted">→</span>
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
