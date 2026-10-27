import { useState } from "react";
import { Loader2 } from "lucide-react";

import { classifyEmail, type EmailClassificationResponse } from "../../services/api";

const KEYWORDS = ["free", "win", "offer"];

// Reproduces nn_chap2.docx's "Example of Email Classification" exactly:
// a 3-input (keyword presence) -> 2-ReLU-hidden -> 1-sigmoid-output network,
// with the doc's own default weights. Toggle the keywords to see the doc's
// own worked numbers (free+offer present -> ~63.65% spam) and any other
// combination computed the same real way.
export default function EmailClassifierCalculator() {
  const [present, setPresent] = useState<boolean[]>([true, false, true]);
  const [result, setResult] = useState<EmailClassificationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await classifyEmail(present.map((p) => (p ? 1 : 0))));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {KEYWORDS.map((kw, i) => (
          <button
            key={kw}
            onClick={() => setPresent((arr) => arr.map((v, idx) => (idx === i ? !v : v)))}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              present[i] ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text" : "border-nexus-border text-nexus-muted hover:text-nexus-text"
            }`}
          >
            "{kw}" {present[i] ? "present" : "absent"}
          </button>
        ))}
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Classify this email
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">H1 output: </span><span className="font-mono">{result.h1_output.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">H2 output: </span><span className="font-mono">{result.h2_output.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">P(spam): </span><span className="font-mono text-nexus-data font-semibold">{(result.output_probability * 100).toFixed(2)}%</span></div>
            <div>
              <span className={`font-semibold ${result.is_spam ? "text-nexus-bad" : "text-nexus-good"}`}>
                {result.is_spam ? "Classified as SPAM" : "Classified as NOT SPAM"}
              </span>
            </div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
