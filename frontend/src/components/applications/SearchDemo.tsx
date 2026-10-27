import { useState } from "react";
import { Search } from "lucide-react";

import { searchNlpTopics, type SearchResponse } from "../../services/api";
import { BACKEND_ERROR, ConfidenceBar, ErrorBanner, RunButton } from "./AppShared";

export default function SearchDemo() {
  const [query, setQuery] = useState("information retrieval");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await searchNlpTopics(query));
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Search NLP topics…"
            className="w-full rounded-lg bg-nexus-bg border border-nexus-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <RunButton onClick={run} loading={loading} label="Search" />
      </div>
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-3">
          {result.results.length === 0 && (
            <p className="text-xs text-nexus-muted">No matching documents in this small educational collection.</p>
          )}
          {result.results.map((r, i) => (
            <div key={r.doc_id} className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-2">
              <p className="text-xs text-nexus-muted">RESULT {String(i + 1).padStart(2, "0")}</p>
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-xs text-nexus-muted">{r.snippet}</p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-nexus-muted w-16">Relevance</span>
                <div className="flex-1">
                  <ConfidenceBar value={r.relevance} />
                </div>
              </div>
              {r.matched_terms.length > 0 && (
                <p className="text-[11px] text-nexus-muted">
                  Matched terms: <span className="text-nexus-accent">{r.matched_terms.join(", ")}</span>
                </p>
              )}
            </div>
          ))}
          <p className="text-[11px] text-nexus-muted/80 italic">
            {result.method}, over a fixed {result.corpus_size}-document educational collection — not a general web
            search engine.
          </p>
        </div>
      )}
    </div>
  );
}
