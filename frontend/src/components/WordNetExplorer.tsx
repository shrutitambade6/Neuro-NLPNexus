import { useState } from "react";

import { WORDNET_DEMO } from "../data/wordnetDemo";

export default function WordNetExplorer() {
  const [query, setQuery] = useState("dog");
  const entry = WORDNET_DEMO[query.trim().toLowerCase()];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-nexus-muted">
        <span className="rounded bg-nexus-warn/10 text-nexus-warn px-2 py-0.5 border border-nexus-warn/30">
          Educational Demo Data
        </span>
        <span>— a small curated dataset, not a live WordNet API call.</span>
      </div>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Try: dog, bank, car, book, flower"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(WORDNET_DEMO).map((w) => (
          <button
            key={w}
            onClick={() => setQuery(w)}
            className="text-xs rounded-md border border-nexus-border px-2.5 py-1 text-nexus-muted hover:text-nexus-text"
          >
            {w}
          </button>
        ))}
      </div>

      {!entry && (
        <p className="text-sm text-nexus-muted">
          "{query}" isn't in this demo's small dataset. Try one of the words above.
        </p>
      )}

      {entry && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-3">
          <p className="text-sm font-semibold">{entry.word}</p>
          <div className="space-y-1">
            {entry.definitions.map((def, i) => (
              <p key={i} className="text-sm text-nexus-muted">
                {i + 1}. {def}
              </p>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-nexus-muted mb-1">Synonyms</p>
              <p className="font-mono text-nexus-data">{entry.synonyms.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-nexus-muted mb-1">Hypernyms</p>
              <p className="font-mono text-nexus-data">{entry.hypernyms.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-nexus-muted mb-1">Hyponyms</p>
              <p className="font-mono text-nexus-data">{entry.hyponyms.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-nexus-muted mb-1">Meronyms</p>
              <p className="font-mono text-nexus-data">{entry.meronyms.join(", ") || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
