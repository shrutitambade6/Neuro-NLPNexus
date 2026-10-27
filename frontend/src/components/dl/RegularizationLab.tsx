import { useState } from "react";
import { Loader2 } from "lucide-react";

import { invertedDropout, l2Penalty, sparsityPenalty, type DropoutResponse, type L2PenaltyResponse, type SparsityPenaltyResponse } from "../../services/api";

// A. Sparse autoencoder KL-divergence sparsity penalty (§11.3).
function SparsityDemo() {
  const [rho, setRho] = useState("0.05");
  const [rhoHat, setRhoHat] = useState("0.1");
  const [result, setResult] = useState<SparsityPenaltyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const r = Number(rho);
    const rh = Number(rhoHat);
    if (Number.isNaN(r) || Number.isNaN(rh) || r <= 0 || r >= 1 || rh <= 0 || rh >= 1) {
      setError("Both ρ and ρ̂ must be numbers strictly between 0 and 1.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await sparsityPenalty(r, rh));
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
          <label className="text-xs text-nexus-muted mb-1 block">ρ (desired average activation)</label>
          <input value={rho} onChange={(e) => setRho(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">ρ̂ (actual average activation)</label>
          <input value={rhoHat} onChange={(e) => setRhoHat(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Compute KL-divergence penalty
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="text-sm"><span className="text-nexus-muted">KL(ρ‖ρ̂): </span><span className="font-mono text-nexus-data font-semibold">{result.kl_divergence.toFixed(6)}</span></div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// B. L2 regularization (§14) — using the doc's own (lambda/2) convention,
// not the more common 2*lambda variant.
function L2Demo() {
  const [weights, setWeights] = useState<string[]>(["0.5", "-0.3"]);
  const [lambda, setLambda] = useState("0.1");
  const [lr, setLr] = useState("0.1");
  const [result, setResult] = useState<L2PenaltyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const w = weights.map(Number);
    const l = Number(lambda);
    const rate = Number(lr);
    if ([...w, l, rate].some(Number.isNaN) || l < 0) {
      setError("Weights, λ (≥0), and learning rate must all be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await l2Penalty(w, l, rate));
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
          <label className="text-xs text-nexus-muted mb-1 block">Weights</label>
          <div className="flex gap-1.5">
            {weights.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setWeights((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">λ (strength)</label>
          <input value={lambda} onChange={(e) => setLambda(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Learning rate η</label>
          <input value={lr} onChange={(e) => setLr(e.target.value)} className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Compute L2 penalty
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">R(W)=Σw²: </span><span className="font-mono">{result.regularization_term.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">penalty (λ/2)·R(W): </span><span className="font-mono text-nexus-data font-semibold">{result.penalty.toFixed(4)}</span></div>
            <div><span className="text-nexus-muted">updated weights: </span><span className="font-mono text-nexus-good">{JSON.stringify(result.updated_weights.map((v) => Number(v.toFixed(4))))}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// C. Inverted dropout (§20.3-20.4) — genuinely random each run.
function DropoutDemo() {
  const [activations, setActivations] = useState<string[]>(["1", "1", "1", "1", "1", "1"]);
  const [p, setP] = useState("0.5");
  const [result, setResult] = useState<DropoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const a = activations.map(Number);
    const prob = Number(p);
    if (a.some(Number.isNaN) || Number.isNaN(prob) || prob < 0 || prob >= 1) {
      setError("Activations must be numbers, and drop probability must be in [0, 1).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await invertedDropout(a, prob));
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
          <label className="text-xs text-nexus-muted mb-1 block">Activations</label>
          <div className="flex gap-1.5 flex-wrap">
            {activations.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setActivations((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-12 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Drop probability p</label>
          <input value={p} onChange={(e) => setP(e.target.value)} className="w-24 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Roll a fresh random mask
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {result.mask.map((m, i) => (
              <span key={i} className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-mono font-semibold ${m ? "bg-nexus-good/20 text-nexus-good" : "bg-nexus-bad/20 text-nexus-bad"}`}>
                {m ? "●" : "○"}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">train output: </span><span className="font-mono">{JSON.stringify(result.train_output.map((v) => Number(v.toFixed(3))))}</span></div>
            <div><span className="text-nexus-muted">test output: </span><span className="font-mono">{JSON.stringify(result.test_output)}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
          <p className="text-xs text-nexus-muted pt-1 border-t border-nexus-border/60">Click again — the mask is genuinely re-randomized every time, not a fixed pattern.</p>
        </div>
      )}
    </div>
  );
}

export default function RegularizationLab() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">A. Sparse autoencoder — KL-divergence sparsity penalty</p>
        <SparsityDemo />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">B. L2 regularization</p>
        <L2Demo />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">C. Inverted dropout</p>
        <DropoutDemo />
      </div>
    </div>
  );
}
