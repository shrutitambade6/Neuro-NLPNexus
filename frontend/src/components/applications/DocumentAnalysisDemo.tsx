import { useState } from "react";

import { analyzeDocument, type DocumentAnalysisResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, PipelineTrail, RunButton } from "./AppShared";
import { buildHighlightSegments, entityColor } from "./nerColors";

const SAMPLE =
  "Shruti works on NLP research at Mumbai University. She published a paper on sentiment analysis last Monday. " +
  "The results were extremely promising and the team is excited about applying it to real-world data.";

export default function DocumentAnalysisDemo() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<DocumentAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await analyzeDocument(text));
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const segments = result ? buildHighlightSegments(result.text, result.entities) : [];

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Paste a document…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <RunButton onClick={run} loading={loading} label="Analyze Document" />
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.word_count}</p>
              <p className="text-[10px] text-nexus-muted">Words</p>
            </div>
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.sentence_count}</p>
              <p className="text-[10px] text-nexus-muted">Sentences</p>
            </div>
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.entities.length}</p>
              <p className="text-[10px] text-nexus-muted">Entities</p>
            </div>
            <div className="rounded-lg border border-nexus-border bg-nexus-surface p-3">
              <p className="text-lg font-semibold">{result.sentiment.label}</p>
              <p className="text-[10px] text-nexus-muted">Sentiment</p>
            </div>
          </div>

          <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 text-sm leading-relaxed">
            {segments.map((seg, i) =>
              seg.label ? (
                <span key={i} className={`rounded px-1 py-0.5 border mx-0.5 font-medium ${entityColor(seg.label)}`}>
                  {seg.text}
                </span>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
              <p className="text-xs text-nexus-muted uppercase tracking-wide mb-2">Keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((k) => (
                  <span key={k.word} className="text-xs rounded-full border border-nexus-border bg-nexus-surface px-2 py-0.5">
                    {k.word} <span className="text-nexus-muted">×{k.count}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
              <p className="text-xs text-nexus-muted uppercase tracking-wide mb-2">Extractive summary</p>
              <p className="text-sm">{result.summary}</p>
            </div>
          </div>

          <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
            <p className="text-xs text-nexus-muted uppercase tracking-wide mb-3">Document Intelligence pipeline</p>
            <PipelineTrail steps={result.pipeline} />
          </div>
        </div>
      )}
    </div>
  );
}
