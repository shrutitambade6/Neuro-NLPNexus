import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeDlLoss, type DlLoss, type DlLossResponse } from "../../services/api";

const LOSSES: { id: DlLoss; label: string }[] = [
  { id: "mse", label: "Mean Squared Error" },
  { id: "binary_crossentropy", label: "Binary Cross-Entropy" },
];

// Real loss arithmetic — calls the backend's dl_foundations.compute_loss.
// Binary cross-entropy is honestly restricted to a prediction strictly
// between 0 and 1 (a probability), matching what the backend enforces.
export default function LossCalculator() {
  const [yPred, setYPred] = useState("0.8");
  const [yTrue, setYTrue] = useState("1");
  const [lossType, setLossType] = useState<DlLoss>("mse");
  const [result, setResult] = useState<DlLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const pred = Number(yPred);
    const truth = Number(yTrue);
    if (Number.isNaN(pred) || Number.isNaN(truth)) {
      setError("Predicted and true values must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await computeDlLoss(pred, truth, lossType));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Predicted (ŷ)</label>
          <input
            value={yPred}
            onChange={(e) => setYPred(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">True (y)</label>
          <input
            value={yTrue}
            onChange={(e) => setYTrue(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Loss function</label>
          <select
            value={lossType}
            onChange={(e) => setLossType(e.target.value as DlLoss)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          >
            {LOSSES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
      {lossType === "binary_crossentropy" && (
        <p className="text-xs text-nexus-muted">
          Binary cross-entropy needs a predicted value strictly between 0 and 1 (a probability, as a
          sigmoid neuron would produce) and a true label of exactly 0 or 1.
        </p>
      )}

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Calculate loss
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="text-sm">
            <span className="text-nexus-muted">L = </span>
            <span className="font-mono text-nexus-good font-semibold">{result.loss.toFixed(4)}</span>
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
