import { useState } from "react";

import { analyzeSentiment, type SentimentResponse } from "../../services/api";
import { BACKEND_ERROR, ConfidenceBar, ErrorBanner, PipelineTrail, RunButton } from "./AppShared";

const LABEL_COLOR: Record<string, string> = {
  Positive: "text-nexus-good",
  Negative: "text-nexus-bad",
  Neutral: "text-nexus-muted",
};

export default function SentimentDemo() {
  const [text, setText] = useState("The product is amazing and works perfectly!");
  const [result, setResult] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeSentiment(text));
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Enter a review…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <RunButton onClick={run} loading={loading} label="Analyze Sentiment" />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3">
            <p className="text-xs text-nexus-muted uppercase tracking-wide">Sentiment</p>
            <p className={`text-2xl font-semibold ${LABEL_COLOR[result.label] ?? ""}`}>{result.label}</p>
            <div>
              <p className="text-xs text-nexus-muted mb-1">Confidence</p>
              <ConfidenceBar value={result.confidence} />
            </div>
            {result.matched_words.length > 0 && (
              <div>
                <p className="text-xs text-nexus-muted mb-1.5">Words that drove the score</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matched_words.map((m, i) => (
                    <span
                      key={i}
                      className={`text-xs rounded-full px-2 py-0.5 border ${
                        m.contribution > 0
                          ? "border-nexus-good/40 bg-nexus-good/10 text-nexus-good"
                          : "border-nexus-bad/40 bg-nexus-bad/10 text-nexus-bad"
                      }`}
                      title={`base ${m.base_polarity}${m.negated ? ", negated" : ""}${m.multiplier !== 1 ? `, ×${m.multiplier}` : ""}`}
                    >
                      {m.negated && "not "}
                      {m.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
            <p className="text-xs text-nexus-muted uppercase tracking-wide mb-3">What happened?</p>
            <PipelineTrail steps={result.pipeline} />
          </div>
        </div>
      )}
    </div>
  );
}
