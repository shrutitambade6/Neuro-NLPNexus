import { useState } from "react";

import { classifyText, type ClassifyResponse } from "../../services/api";
import { BACKEND_ERROR, ConfidenceBar, ErrorBanner, MethodNote, RunButton } from "./AppShared";

export default function ClassificationDemo() {
  const [text, setText] = useState("The central bank raised interest rates to control inflation.");
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await classifyText(text));
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
        rows={2}
        placeholder="Enter a sentence to categorize…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <RunButton onClick={run} loading={loading} label="Classify" />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3">
          <div>
            <p className="text-xs text-nexus-muted uppercase tracking-wide">Category</p>
            <p className="text-xl font-semibold text-nexus-accent">{result.predicted_category}</p>
          </div>
          <div className="space-y-1.5">
            {result.categories.map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className={`text-xs w-24 shrink-0 ${c === result.predicted_category ? "text-nexus-text font-medium" : "text-nexus-muted"}`}>
                  {c}
                </span>
                <ConfidenceBar value={result.probabilities[c]} />
              </div>
            ))}
          </div>
          <MethodNote>
            {result.method_note} Trained on {result.training_examples_per_category[result.predicted_category]}{" "}
            examples for this category.
          </MethodNote>
        </div>
      )}
    </div>
  );
}
