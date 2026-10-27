import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { backpropStep, backpropTrain, type BackpropStepResponse, type BackpropTrainResponse } from "../../services/api";
import { nexusVar } from "../../utils/theme";

const DOC_DEFAULTS = { x1: 0.35, x2: 0.7, target: 0.5, learning_rate: 1.0 };

// One hand-worked backprop step, defaulting to the exact network diagram
// and inputs from Neural_network_chap-2.docx's own worked example (a
// 2-input, 2-sigmoid-hidden, 1-sigmoid-output network). Full precision is
// used throughout (not the doc's own 2-decimal rounding at each step), so
// results land close to but not bit-for-bit identical to the doc's
// rounded numbers — disclosed explicitly below, matching the backend's
// own documented divergence.
function SingleStep() {
  const [x1, setX1] = useState(String(DOC_DEFAULTS.x1));
  const [x2, setX2] = useState(String(DOC_DEFAULTS.x2));
  const [target, setTarget] = useState(String(DOC_DEFAULTS.target));
  const [lr, setLr] = useState(String(DOC_DEFAULTS.learning_rate));
  const [result, setResult] = useState<BackpropStepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const vals = [x1, x2, target, lr].map(Number);
    if (vals.some(Number.isNaN)) {
      setError("All fields must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await backpropStep(vals[0], vals[1], vals[2], vals[3]));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-4 gap-3">
        <div><label className="text-xs text-nexus-muted mb-1 block">x1</label><input value={x1} onChange={(e) => setX1(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" /></div>
        <div><label className="text-xs text-nexus-muted mb-1 block">x2</label><input value={x2} onChange={(e) => setX2(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" /></div>
        <div><label className="text-xs text-nexus-muted mb-1 block">Target</label><input value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" /></div>
        <div><label className="text-xs text-nexus-muted mb-1 block">Learning rate</label><input value={lr} onChange={(e) => setLr(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" /></div>
      </div>
      <p className="text-xs text-nexus-muted">Network weights: w₁,₁=w₂,₁=0.2, w₁,₂=w₂,₂=0.3, w₁,₃=0.3, w₂,₃=0.9 (read off the doc's own diagram) — the calculator below always starts from these.</p>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Run one forward + backward pass
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <div><span className="text-nexus-muted">y3 (h1 output): </span><span className="font-mono">{result.y3.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">y4 (h2 output): </span><span className="font-mono">{result.y4.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">y5 (final output): </span><span className="font-mono text-nexus-data font-semibold">{result.y5.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">error (target − y5): </span><span className="font-mono">{result.error.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">δ5: </span><span className="font-mono">{result.delta5.toFixed(5)}</span></div>
            <div><span className="text-nexus-muted">updated w₂,₃: </span><span className="font-mono text-nexus-good">{result.updated_network.w35.toFixed(4)}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60 max-h-40 overflow-y-auto">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
          <p className="text-xs text-nexus-muted pt-1 border-t border-nexus-border/60">
            The doc's own hand calculation rounds every intermediate value to 2 decimal places (e.g. y3≈0.56, y5≈0.67);
            this calculator keeps full floating-point precision throughout, so its numbers (y5≈{result.y5.toFixed(3)})
            land close to, but not exactly on, the doc's rounded answer — the method is identical, only the rounding
            discipline differs.
          </p>
        </div>
      )}
    </div>
  );
}

// Real iterative training: repeatedly re-runs the same backprop step,
// chaining each step's updated network into the next, until the error
// genuinely shrinks toward zero — proving the doc's own claim ("this
// process continues until the desired output is reached") rather than
// just asserting it.
function TrainToConverge() {
  const [numSteps, setNumSteps] = useState("200");
  const [result, setResult] = useState<BackpropTrainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const n = Number(numSteps);
    if (!Number.isInteger(n) || n <= 0) {
      setError("Number of steps must be a positive integer.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await backpropTrain(DOC_DEFAULTS.x1, DOC_DEFAULTS.x2, DOC_DEFAULTS.target, DOC_DEFAULTS.learning_rate, n));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.history.map((h, i) => ({ step: i + 1, error: Math.abs(h.error), output: h.y5 })) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Number of steps (max 500)</label>
          <input value={numSteps} onChange={(e) => setNumSteps(e.target.value)} className="w-32 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Train for real, this many steps
        </button>
      </div>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={nexusVar("border")} />
                  <XAxis dataKey="step" tick={{ fontSize: 11, fill: nexusVar("muted") }} />
                  <YAxis tick={{ fontSize: 11, fill: nexusVar("muted") }} />
                  <Tooltip
                    contentStyle={{ background: nexusVar("surface"), border: `1px solid ${nexusVar("border")}`, fontSize: 12 }}
                    labelStyle={{ color: nexusVar("muted") }}
                    formatter={(value: number) => value.toFixed(4)}
                  />
                  <Line type="monotone" dataKey="error" name="|error|" stroke={nexusVar("bad")} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="output" name="y5 (output)" stroke={nexusVar("accent")} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-sm">
            After {result.history.length} real steps: output = <span className="font-mono text-nexus-good">{result.final_output.toFixed(4)}</span>,
            error = <span className="font-mono">{result.final_error.toFixed(4)}</span> (target was {DOC_DEFAULTS.target}) — the same
            hand-worked process from the doc, just genuinely repeated instead of stopping after one iteration.
          </p>
        </div>
      )}
    </div>
  );
}

export default function BackpropLab() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">A. One worked step (defaults reproduce the textbook's example)</p>
        <SingleStep />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">B. Real repeated training — watch the error actually shrink</p>
        <TrainToConverge />
      </div>
    </div>
  );
}
