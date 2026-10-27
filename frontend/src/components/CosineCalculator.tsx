import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeCosine, type CosineResponse } from "../services/api";

export default function CosineCalculator() {
  const [vecAText, setVecAText] = useState("1, 2, 3");
  const [vecBText, setVecBText] = useState("2, 4, 6");
  const [result, setResult] = useState<CosineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseVec = (text: string) => text.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n));

  const run = async () => {
    const a = parseVec(vecAText);
    const b = parseVec(vecBText);
    if (a.length === 0 || a.length !== b.length) {
      setError("Vectors must be the same length and non-empty.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await computeCosine(a, b));
    } catch {
      setError("Couldn't reach the backend, or vector lengths mismatched.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Vector A (comma-separated numbers)</label>
          <input
            value={vecAText}
            onChange={(e) => setVecAText(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Vector B (comma-separated numbers)</label>
          <input
            value={vecBText}
            onChange={(e) => setVecBText(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
      </div>
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Calculate cosine similarity
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-1.5 text-sm font-mono text-nexus-muted">
          <div>Step 1 — Dot product: A·B = {result.dot_product.toFixed(3)}</div>
          <div>Step 2 — ‖A‖ = {result.magnitude_a.toFixed(3)}</div>
          <div>Step 3 — ‖B‖ = {result.magnitude_b.toFixed(3)}</div>
          <div>Step 4 — cos(A,B) = A·B / (‖A‖‖B‖)</div>
          <div className="text-nexus-good font-semibold">
            Step 5 — Result = {result.cosine_similarity.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}
