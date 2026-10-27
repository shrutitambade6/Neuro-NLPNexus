import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { runDlGradientDescent, type DlActivation, type DlGradientDescentResponse, type DlLoss } from "../../services/api";
import { nexusVar } from "../../utils/theme";

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

// Real, iterative gradient descent on one neuron: every epoch shown in the
// chart below is an actual forward pass + loss + gradient + parameter
// update computed by the backend (dl_foundations.gradient_descent) — the
// curve is the neuron's real loss history, not a smoothed illustration.
export default function GradientDescentLab() {
  const [inputsText, setInputsText] = useState("1, 2");
  const [weightsText, setWeightsText] = useState("0.1, 0.1");
  const [bias, setBias] = useState("0");
  const [yTrue, setYTrue] = useState("1");
  const [activation, setActivation] = useState<DlActivation>("sigmoid");
  const [lossType, setLossType] = useState<DlLoss>("mse");
  const [learningRate, setLearningRate] = useState("0.5");
  const [epochs, setEpochs] = useState("20");
  const [result, setResult] = useState<DlGradientDescentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const inputs = parseList(inputsText);
    const weights = parseList(weightsText);
    const b = Number(bias);
    const y = Number(yTrue);
    const lr = Number(learningRate);
    const ep = Number(epochs);
    if (inputs.length === 0 || weights.length === 0 || inputs.length !== weights.length) {
      setError("Inputs and weights must be comma-separated lists of the same length.");
      return;
    }
    if ([b, y, lr, ep].some(Number.isNaN)) {
      setError("Bias, true value, learning rate, and epochs must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await runDlGradientDescent(inputs, weights, b, y, activation, lossType, lr, ep));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.steps.map((s) => ({ epoch: s.epoch, loss: Number(s.loss.toFixed(5)) })) ?? [];

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
          <label className="text-xs text-nexus-muted">Starting weights (comma-separated)</label>
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
          <label className="text-xs text-nexus-muted">Learning rate</label>
          <input
            value={learningRate}
            onChange={(e) => setLearningRate(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
        <div>
          <label className="text-xs text-nexus-muted">Epochs (max 50)</label>
          <input
            value={epochs}
            onChange={(e) => setEpochs(e.target.value)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
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
        <div>
          <label className="text-xs text-nexus-muted">Loss function</label>
          <select
            value={lossType}
            onChange={(e) => setLossType(e.target.value as DlLoss)}
            className="w-full mt-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          >
            <option value="mse">Mean Squared Error</option>
            <option value="binary_crossentropy">Binary Cross-Entropy (sigmoid only)</option>
          </select>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        Run gradient descent
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4">
            <p className="text-xs text-nexus-muted mb-2">Real loss after each epoch — should trend down</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: nexusVar("muted") }} />
                  <YAxis tick={{ fontSize: 11, fill: nexusVar("muted") }} />
                  <Tooltip
                    contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
                    labelStyle={{ color: nexusVar("muted") }}
                  />
                  <Line type="monotone" dataKey="loss" stroke={nexusVar("accent")} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 text-sm space-y-1">
            <p>
              <span className="text-nexus-muted">Final weights: </span>
              <span className="font-mono text-nexus-data">[{result.final_weights.map((w) => w.toFixed(4)).join(", ")}]</span>
            </p>
            <p>
              <span className="text-nexus-muted">Final bias: </span>
              <span className="font-mono text-nexus-data">{result.final_bias.toFixed(4)}</span>
            </p>
            <p>
              <span className="text-nexus-muted">Final loss: </span>
              <span className="font-mono text-nexus-good font-semibold">{result.final_loss.toFixed(5)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
