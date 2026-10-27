import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeSoftmax, type SoftmaxResponse } from "../../services/api";
import { nexusVar } from "../../utils/theme";

const BAR_COLORS = [
  nexusVar("accent"),
  nexusVar("yellow"),
  nexusVar("purple"),
  nexusVar("data"),
  nexusVar("gold"),
  nexusVar("accentDim"),
];

// Softmax is vector-based (it normalizes several logits together), so it
// gets its own small widget rather than living on the single-z curve
// above — real softmax arithmetic via the backend, including the
// max-subtraction numerical-stability step shown in the trace.
export default function SoftmaxVisualizer() {
  const [valuesText, setValuesText] = useState("2, 1, 0.1");
  const [result, setResult] = useState<SoftmaxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const values = valuesText
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    if (values.length === 0) {
      setError("Enter at least one number.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await computeSoftmax(values));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-nexus-muted">Logits (comma-separated — e.g. raw output-layer scores)</label>
        <input
          value={valuesText}
          onChange={(e) => setValuesText(e.target.value)}
          className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Apply softmax
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="space-y-2">
            {result.output.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-nexus-muted w-16 shrink-0 font-mono">
                  z{i + 1}={result.input[i]}
                </span>
                <div className="h-3 flex-1 rounded-full bg-nexus-surfaceAlt overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${p * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
                  />
                </div>
                <span className="text-xs font-mono text-nexus-text w-14 text-right">{(p * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => (
              <div key={i}>{s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
