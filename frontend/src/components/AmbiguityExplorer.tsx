import { useState } from "react";
import { motion } from "framer-motion";

export default function AmbiguityExplorer() {
  const [interpretation, setInterpretation] = useState<"a" | "b" | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm font-mono bg-nexus-bg border border-nexus-border rounded-lg px-3 py-2">
        "I saw the man with the telescope."
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={() => setInterpretation("a")}
          className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
            interpretation === "a" ? "border-nexus-accent bg-nexus-accent/10" : "border-nexus-border"
          }`}
        >
          <span className="font-medium">Interpretation A</span>
          <p className="text-xs text-nexus-muted mt-0.5">I used the telescope to see him.</p>
        </button>
        <button
          onClick={() => setInterpretation("b")}
          className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
            interpretation === "b" ? "border-nexus-accent bg-nexus-accent/10" : "border-nexus-border"
          }`}
        >
          <span className="font-medium">Interpretation B</span>
          <p className="text-xs text-nexus-muted mt-0.5">The man had the telescope with him.</p>
        </button>
      </div>
      {interpretation && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-nexus-muted">
          Both readings are grammatically valid — this is a structural
          (syntactic) ambiguity that resolves into two different semantic
          interpretations. Nothing in the sentence itself picks one over the
          other; only extra context would.
        </motion.p>
      )}
    </div>
  );
}
