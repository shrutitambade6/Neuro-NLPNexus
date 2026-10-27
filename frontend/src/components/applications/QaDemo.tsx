import { useState } from "react";

import { askQuestion, type QaResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";

export default function QaDemo() {
  const [context, setContext] = useState("Shruti visited Mumbai University on Monday. She gave a talk about NLP.");
  const [question, setQuestion] = useState("Who visited Mumbai University?");
  const [result, setResult] = useState<QaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!context.trim() || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await askQuestion(context, question));
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-nexus-muted block mb-1">Context</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Paste a paragraph…"
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <div>
        <label className="text-xs text-nexus-muted block mb-1">Question</label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <RunButton onClick={run} loading={loading} label="Find Answer" />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3">
          {result.answer ? (
            <>
              <div>
                <p className="text-xs text-nexus-muted uppercase tracking-wide">Answer</p>
                <p className="text-lg font-semibold text-nexus-accent">{result.answer}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted uppercase tracking-wide mb-1">Source context</p>
                <p className="text-sm leading-relaxed">
                  {result.context.split(result.answer_sentence ?? "").map((part, i, arr) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <mark className="bg-nexus-yellow/30 text-nexus-text rounded px-0.5">
                          {result.answer_sentence}
                        </mark>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-nexus-muted">{result.message}</p>
          )}
          <p className="text-[11px] text-nexus-muted/80 italic border-t border-nexus-border/50 pt-2">
            {result.method_note}
          </p>
        </div>
      )}
    </div>
  );
}
