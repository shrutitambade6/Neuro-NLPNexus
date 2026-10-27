import { useState } from "react";

import { lookupRelation } from "../data/relationPairs";

export default function TryYourOwnRelation() {
  const [word1, setWord1] = useState("");
  const [word2, setWord2] = useState("");
  const [result, setResult] = useState<ReturnType<typeof lookupRelation> | null>(null);

  const analyze = () => {
    if (!word1.trim() || !word2.trim()) return;
    setResult(lookupRelation(word1, word2));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-nexus-muted">
        Checked against a small curated dataset — not a general relation
        classifier. Unrecognized pairs are reported honestly, not guessed.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={word1}
          onChange={(e) => setWord1(e.target.value)}
          placeholder="Word 1"
          className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
        <input
          value={word2}
          onChange={(e) => setWord2(e.target.value)}
          placeholder="Word 2"
          className="rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <button
        onClick={analyze}
        className="rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90"
      >
        Analyze relation
      </button>
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 text-sm">
          {result.found ? (
            <>
              <p className="text-nexus-good font-medium mb-1">
                {word1} is a <span className="font-mono">{result.relation}</span> of {word2}
              </p>
              <p className="text-nexus-muted text-xs">{result.explanation}</p>
            </>
          ) : (
            <p className="text-nexus-warn">Unable to determine automatically.</p>
          )}
        </div>
      )}
    </div>
  );
}
