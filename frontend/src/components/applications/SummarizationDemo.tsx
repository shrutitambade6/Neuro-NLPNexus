import { useState } from "react";

import { summarizeText, type SummarizeResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";

const SAMPLE =
  "Natural language processing combines linguistics and computer science to let computers work with human " +
  "language. It starts with tokenization, splitting text into words or subword units. Parsing then builds a " +
  "grammatical structure showing how those words combine into phrases. Semantic analysis studies what the " +
  "text actually means, using techniques like TF-IDF and word sense disambiguation. Discourse analysis looks " +
  "at how sentences connect to each other across a longer passage. Together these stages let real applications " +
  "like search engines, chatbots, and translation systems understand and generate language.";

export default function SummarizationDemo() {
  const [text, setText] = useState(SAMPLE);
  const [nSentences, setNSentences] = useState(2);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await summarizeText(text, nSentences));
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
        rows={6}
        placeholder="Paste text to summarize…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-nexus-muted">Sentences in summary</label>
        <input
          type="number"
          min={1}
          max={10}
          value={nSentences}
          onChange={(e) => setNSentences(Number(e.target.value) || 1)}
          className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-sm"
        />
        <RunButton onClick={run} loading={loading} label="Summarize" />
      </div>
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
            <p className="text-xs text-nexus-muted uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.original_word_count}</p>
              <p className="text-[11px] text-nexus-muted">Original words</p>
            </div>
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.summary_word_count}</p>
              <p className="text-[11px] text-nexus-muted">Summary words</p>
            </div>
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold text-nexus-accent">{Math.round(result.compression_ratio * 100)}%</p>
              <p className="text-[11px] text-nexus-muted">Compression</p>
            </div>
          </div>
          <p className="text-[11px] text-nexus-muted/80 italic">
            Extractive summarization (word-frequency sentence scoring) — every sentence above is copied verbatim
            from the source, never generated.
          </p>
        </div>
      )}
    </div>
  );
}
