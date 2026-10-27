import { useState } from "react";
import { Loader2 } from "lucide-react";

import { neuronForward, type DlActivation, type NeuronForwardResponse } from "../../services/api";

const ACTIVATIONS: { id: DlActivation; label: string }[] = [
  { id: "sigmoid", label: "Sigmoid" },
  { id: "tanh", label: "Tanh" },
  { id: "relu", label: "ReLU" },
  { id: "leaky_relu", label: "Leaky ReLU" },
  { id: "linear", label: "Linear" },
];

// A single artificial neuron: real weighted-sum + activation arithmetic on
// whatever inputs/weights/bias the student enters — calls the backend's
// dl_foundations.neuron_forward, never a client-side approximation.
export default function NeuronCalculator() {
  const [inputs, setInputs] = useState<string[]>(["1", "2"]);
  const [weights, setWeights] = useState<string[]>(["0.5", "-1"]);
  const [bias, setBias] = useState("0.5");
  const [activation, setActivation] = useState<DlActivation>("sigmoid");
  const [result, setResult] = useState<NeuronForwardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addInput = () => {
    if (inputs.length >= 4) return;
    setInputs((v) => [...v, "1"]);
    setWeights((v) => [...v, "0.5"]);
  };
  const removeInput = () => {
    if (inputs.length <= 1) return;
    setInputs((v) => v.slice(0, -1));
    setWeights((v) => v.slice(0, -1));
  };

  const run = async () => {
    const parsedInputs = inputs.map(Number);
    const parsedWeights = weights.map(Number);
    const parsedBias = Number(bias);
    if (parsedInputs.some(Number.isNaN) || parsedWeights.some(Number.isNaN) || Number.isNaN(parsedBias)) {
      setError("All inputs, weights, and the bias must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await neuronForward(parsedInputs, parsedWeights, parsedBias, activation));
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-nexus-muted">Inputs (x)</label>
            <div className="flex gap-2 text-xs">
              <button onClick={removeInput} className="text-nexus-muted hover:text-nexus-text">− input</button>
              <button onClick={addInput} className="text-nexus-accent hover:underline">+ input</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {inputs.map((v, i) => (
              <input
                key={i}
                value={v}
                onChange={(e) => setInputs((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                placeholder={`x${i + 1}`}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Weights (w)</label>
          <div className="space-y-1.5">
            {weights.map((v, i) => (
              <input
                key={i}
                value={v}
                onChange={(e) => setWeights((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                placeholder={`w${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-nexus-muted">Bias (b)</label>
          <input
            value={bias}
            onChange={(e) => setBias(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Activation function</label>
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
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Run forward pass
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-nexus-muted">z (weighted sum): </span>
              <span className="font-mono text-nexus-data">{result.weighted_sum.toFixed(4)}</span>
            </div>
            <div>
              <span className="text-nexus-muted">output = {result.activation}(z): </span>
              <span className="font-mono text-nexus-good font-semibold">{result.activated_output.toFixed(4)}</span>
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
