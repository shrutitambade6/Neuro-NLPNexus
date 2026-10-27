import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeJaccard, type JaccardResponse } from "../services/api";

export default function JaccardCalculator() {
  const [setAText, setSetAText] = useState("apple, banana, orange");
  const [setBText, setSetBText] = useState("banana, orange, mango");
  const [result, setResult] = useState<JaccardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const setA = setAText.split(",").map((s) => s.trim()).filter(Boolean);
    const setB = setBText.split(",").map((s) => s.trim()).filter(Boolean);
    if (setA.length === 0 || setB.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await computeJaccard(setA, setB));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Set A (comma-separated)</label>
          <input
            value={setAText}
            onChange={(e) => setSetAText(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Set B (comma-separated)</label>
          <input
            value={setBText}
            onChange={(e) => setSetBText(e.target.value)}
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
        Calculate Jaccard
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2 text-sm">
          <div className="flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-nexus-muted">Intersection: </span>
              <span className="font-mono text-nexus-data">{result.intersection.join(", ") || "∅"}</span>{" "}
              <span className="text-nexus-muted">({result.intersection_size})</span>
            </div>
            <div>
              <span className="text-nexus-muted">Union: </span>
              <span className="font-mono text-nexus-data">{result.union.join(", ")}</span>{" "}
              <span className="text-nexus-muted">({result.union_size})</span>
            </div>
          </div>
          <div className="font-mono text-nexus-muted">
            J(A,B) = {result.intersection_size} / {result.union_size} ={" "}
            <span className="text-nexus-good font-semibold">{result.jaccard.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
