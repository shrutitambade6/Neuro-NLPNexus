import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  perceptronForward,
  perceptronLearningStep,
  trainPerceptron,
  type PLAStepResponse,
  type PLATrainResponse,
  type PerceptronForwardResponse,
} from "../../services/api";

// Section A: a single perceptron forward pass (chap_01.docx §3: weighted
// sum -> step function -> 0/1 prediction).
function ForwardPass() {
  const [inputs, setInputs] = useState<string[]>(["1", "1"]);
  const [weights, setWeights] = useState<string[]>(["0.5", "0.5"]);
  const [bias, setBias] = useState("-0.7");
  const [result, setResult] = useState<PerceptronForwardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const i = inputs.map(Number);
    const w = weights.map(Number);
    const b = Number(bias);
    if (i.some(Number.isNaN) || w.some(Number.isNaN) || Number.isNaN(b)) {
      setError("Inputs, weights, and bias must all be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await perceptronForward(i, w, b));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Inputs</label>
          <div className="flex gap-1.5">
            {inputs.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setInputs((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Weights</label>
          <div className="flex gap-1.5">
            {weights.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setWeights((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Bias</label>
          <input value={bias} onChange={(e) => setBias(e.target.value)} className="w-20 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Run forward pass
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">z: </span><span className="font-mono text-nexus-data">{result.weighted_sum.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">prediction: </span><span className="font-mono text-nexus-good font-semibold">{result.prediction}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// Section B: one hand-worked Perceptron Learning Algorithm update step,
// defaulting to the exact example in chap_01.docx §4.4 (inputs [1,1],
// weights [0.2,0.3], bias -0.7, target 1, lr 0.1) so the default Run
// reproduces the textbook's own numbers exactly.
function LearningStep() {
  const [inputs, setInputs] = useState<string[]>(["1", "1"]);
  const [weights, setWeights] = useState<string[]>(["0.2", "0.3"]);
  const [bias, setBias] = useState("-0.7");
  const [target, setTarget] = useState("1");
  const [lr, setLr] = useState("0.1");
  const [result, setResult] = useState<PLAStepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const i = inputs.map(Number);
    const w = weights.map(Number);
    const b = Number(bias);
    const t = Number(target);
    const rate = Number(lr);
    if ([...i, ...w, b, t, rate].some(Number.isNaN)) {
      setError("All fields must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await perceptronLearningStep(i, w, b, t, rate));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Inputs</label>
          <div className="flex gap-1.5">
            {inputs.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setInputs((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-14 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Weights</label>
          <div className="flex gap-1.5">
            {weights.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setWeights((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-14 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Bias</label>
          <input value={bias} onChange={(e) => setBias(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Target</label>
          <input value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Learning rate</label>
          <input value={lr} onChange={(e) => setLr(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Run one PLA update
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">prediction: </span><span className="font-mono">{result.prediction}</span></div>
            <div><span className="text-nexus-muted">error (target - prediction): </span><span className="font-mono text-nexus-data">{result.error}</span></div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">updated weights: </span><span className="font-mono text-nexus-good">{JSON.stringify(result.updated_weights.map((v) => Number(v.toFixed(4))))}</span></div>
            <div><span className="text-nexus-muted">updated bias: </span><span className="font-mono text-nexus-good">{result.updated_bias.toFixed(4)}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// Section C: full PLA training to convergence, defaulting to the AND gate
// (the same GATE_PRESETS as the M-P neuron section) — real repeated epochs,
// not a canned animation, so it genuinely stops the moment zero errors occur.
function TrainToConvergence() {
  const [gate, setGate] = useState<"AND" | "OR">("AND");
  const [lr, setLr] = useState("0.1");
  const [result, setResult] = useState<PLATrainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GATE_DATA: Record<"AND" | "OR", { inputs: number[]; target: number }[]> = {
    AND: [
      { inputs: [0, 0], target: 0 },
      { inputs: [0, 1], target: 0 },
      { inputs: [1, 0], target: 0 },
      { inputs: [1, 1], target: 1 },
    ],
    OR: [
      { inputs: [0, 0], target: 0 },
      { inputs: [0, 1], target: 1 },
      { inputs: [1, 0], target: 1 },
      { inputs: [1, 1], target: 1 },
    ],
  };

  const run = async () => {
    const rate = Number(lr);
    if (Number.isNaN(rate)) {
      setError("Learning rate must be a number.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await trainPerceptron(GATE_DATA[gate], [0, 0], 0, rate, 20));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Gate to learn</label>
          <div className="flex gap-2">
            {(["AND", "OR"] as const).map((g) => (
              <button key={g} onClick={() => setGate(g)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${gate === g ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text" : "border-nexus-border text-nexus-muted hover:text-nexus-text"}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Learning rate</label>
          <input value={lr} onChange={(e) => setLr(e.target.value)} className="w-24 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Train from scratch (weights start at 0)
        </button>
      </div>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <p className="text-sm">
            {result.converged ? (
              <span className="text-nexus-good font-medium">Converged in {result.epochs_run} epoch(s).</span>
            ) : (
              <span className="text-nexus-bad font-medium">Did not converge within {result.epochs_run} epochs (this is expected for a linearly-inseparable problem like XOR — the PLA convergence theorem only guarantees convergence when the classes are linearly separable).</span>
            )}
          </p>
          <div className="text-sm">
            <span className="text-nexus-muted">Final weights: </span>
            <span className="font-mono">{JSON.stringify(result.final_weights.map((v) => Number(v.toFixed(3))))}</span>
            <span className="text-nexus-muted"> bias: </span>
            <span className="font-mono">{result.final_bias.toFixed(3)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-nexus-muted text-left border-b border-nexus-border">
                  <th className="py-1.5 pr-3">Epoch</th>
                  <th className="py-1.5 pr-3">Total errors</th>
                  <th className="py-1.5 pr-3">Weights</th>
                  <th className="py-1.5 pr-3">Bias</th>
                </tr>
              </thead>
              <tbody className="text-nexus-muted">
                {result.history.map((h) => (
                  <tr key={h.epoch} className="border-b border-nexus-border/40 last:border-0">
                    <td className="py-1.5 pr-3 font-mono">{h.epoch}</td>
                    <td className={`py-1.5 pr-3 font-mono ${h.total_errors === 0 ? "text-nexus-good" : ""}`}>{h.total_errors}</td>
                    <td className="py-1.5 pr-3 font-mono">{JSON.stringify(h.weights.map((v) => Number(v.toFixed(2))))}</td>
                    <td className="py-1.5 pr-3 font-mono">{h.bias.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PerceptronLab() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">A. Forward pass</p>
        <ForwardPass />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">B. One learning-rule update (defaults reproduce the textbook's own example exactly)</p>
        <LearningStep />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">C. Train to convergence — real repeated epochs</p>
        <TrainToConvergence />
      </div>
    </div>
  );
}
