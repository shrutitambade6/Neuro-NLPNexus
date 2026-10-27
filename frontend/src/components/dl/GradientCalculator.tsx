import { useState } from "react";
import { Loader2 } from "lucide-react";

import { computeDlGradient, type DlActivation, type DlGradientResponse, type DlLoss } from "../../services/api";

const ACTIVATIONS: { id: DlActivation; label: string }[] = [
  { id: "sigmoid", label: "Sigmoid" },
  { id: "tanh", label: "Tanh" },
  { id: "relu", label: "ReLU" },
  { id: "leaky_relu", label: "Leaky ReLU" },
  { id: "linear", label: "Linear" },
];

function parseList(text: string): number[] {
  return text.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
}

// The real chain rule for one neuron, for one (inputs, target) example: a
// single snapshot of what backpropagation actually computes, before
// Gradient Descent (below) applies it repeatedly. Calls the backend's
// dl_foundations.single_neuron_gradient, which is verified in the backend
// test suite against an independent numerical finite-difference gradient.
export default function GradientCalculator() {
  const [inputsText, setInputsText] = useState("1, 2");
  const [weightsText, setWeightsText] = useState("0.5, -1");
  const [bias, setBias] = useState("0.5");
  const [yTrue, setYTrue] = useState("1");
  const [activation, setActivation] = useState<DlActivation>("sigmoid");
  const [lossType, setLossType] = useState<DlLoss>("mse");
  const [result, setResult] = useState<DlGradientResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const inputs = parseList(inputsText);
    const weights = parseList(weightsText);
    const b = Number(bias);
    const y = Number(yTrue);
    if (inputs.length === 0 || weights.length === 0 || inputs.length !== weights.length) {
      setError("Inputs and weights must be comma-separated lists of the same length.");
      return;
    }
    if ([b, y].some(Number.isNaN)) {
      setError("Bias and target must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await computeDlGradient(inputs, weights, b, y, activation, lossType));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Inputs (comma-separated)</label>
          <input
            value={inputsText}
            onChange={(e) => setInputsText(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Weights (comma-separated)</label>
          <input
            value={weightsText}
            onChange={(e) => setWeightsText(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Bias</label>
          <input
            value={bias}
            onChange={(e) => setBias(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Target (y)</label>
          <input
            value={yTrue}
            onChange={(e) => setYTrue(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Activation</label>
          <select
            value={activation}
            onChange={(e) => setActivation(e.target.value as DlActivation)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          >
            {ACTIVATIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Loss</label>
          <select
            value={lossType}
            onChange={(e) => setLossType(e.target.value as DlLoss)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          >
            <option value="mse">MSE</option>
            <option value="binary_crossentropy">Binary Cross-Entropy</option>
          </select>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Compute gradient
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-nexus-muted">∂L/∂w: </span>
              <span className="font-mono text-nexus-data">[{result.dl_dw.map((g) => g.toFixed(4)).join(", ")}]</span>
            </div>
            <div>
              <span className="text-nexus-muted">∂L/∂b: </span>
              <span className="font-mono text-nexus-data">{result.dl_db.toFixed(4)}</span>
            </div>
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
