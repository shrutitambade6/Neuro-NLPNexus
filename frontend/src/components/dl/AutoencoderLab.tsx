import { useState } from "react";
import { Loader2 } from "lucide-react";

import { linearAutoencoder, reconstructionLoss, type LinearAutoencoderResponse, type ReconstructionLossResponse } from "../../services/api";

// A. A real linear encoder/decoder pass (Autoencoders_1.docx §9: "linear
// autoencoder ~ PCA"), compressing a small input vector to a lower
// dimension and back, with genuine reconstruction MSE — not illustrative.
function LinearAutoencoderDemo() {
  const [input, setInput] = useState<string[]>(["3", "1"]);
  // Fixed encoder/decoder for this demo (2-dim input -> 1-dim latent -> 2-dim
  // reconstruction) — only the input vector is user-editable, keeping this a
  // "lighter interactivity" calculator rather than a full matrix editor.
  const encoder: string[][] = [["0.5", "0.5"]];
  const decoder: string[][] = [["1"], ["1"]];
  const [result, setResult] = useState<LinearAutoencoderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const inputVec = input.map(Number);
    const encMat = encoder.map((row) => row.map(Number));
    const decMat = decoder.map((row) => row.map(Number));
    if ([...inputVec, ...encMat.flat(), ...decMat.flat()].some(Number.isNaN)) {
      setError("All fields must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await linearAutoencoder(inputVec, encMat, decMat));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-nexus-muted">
        Default: a 2-dimensional input compressed to a 1-dimensional latent code (h = 0.5x₁ + 0.5x₂), then decoded back
        (x̂ = h, h) — a genuine (if tiny) linear encoder/decoder pair, exactly the setup §9 relates to PCA.
      </p>
      <div>
        <label className="text-xs text-nexus-muted mb-1 block">Input vector x</label>
        <div className="flex gap-1.5">
          {input.map((v, i) => (
            <input key={i} value={v} onChange={(e) => setInput((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
          ))}
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Encode then decode
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">latent h: </span><span className="font-mono">{JSON.stringify(result.latent.map((v) => Number(v.toFixed(4))))}</span></div>
            <div><span className="text-nexus-muted">reconstruction x̂: </span><span className="font-mono">{JSON.stringify(result.reconstruction.map((v) => Number(v.toFixed(4))))}</span></div>
            <div><span className="text-nexus-muted">MSE: </span><span className="font-mono text-nexus-data font-semibold">{result.mse.toFixed(4)}</span></div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// B. Real reconstruction-loss calculator (§6): MSE always, BCE when values
// are in [0,1].
function ReconstructionLossDemo() {
  const [original, setOriginal] = useState<string[]>(["0.2", "0.8"]);
  const [reconstructed, setReconstructed] = useState<string[]>(["0.3", "0.7"]);
  const [result, setResult] = useState<ReconstructionLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const o = original.map(Number);
    const r = reconstructed.map(Number);
    if ([...o, ...r].some(Number.isNaN)) {
      setError("All values must be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await reconstructionLoss(o, r));
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
          <label className="text-xs text-nexus-muted mb-1 block">Original x</label>
          <div className="flex gap-1.5">
            {original.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setOriginal((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-nexus-muted mb-1 block">Reconstructed x̂</label>
          <div className="flex gap-1.5">
            {reconstructed.map((v, i) => (
              <input key={i} value={v} onChange={(e) => setReconstructed((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))} className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50" />
            ))}
          </div>
        </div>
      </div>
      <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading && <Loader2 size={14} className="animate-spin" />}
        Compute loss
      </button>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}
      {result && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-nexus-muted">MSE: </span><span className="font-mono text-nexus-data font-semibold">{result.mse.toFixed(4)}</span></div>
            <div>
              <span className="text-nexus-muted">BCE: </span>
              <span className="font-mono">{result.binary_cross_entropy === null ? "n/a (values outside [0,1])" : result.binary_cross_entropy.toFixed(4)}</span>
            </div>
          </div>
          <div className="font-mono text-xs text-nexus-muted space-y-0.5 pt-1 border-t border-nexus-border/60">
            {result.steps.map((s, i) => <div key={i}>{s}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AutoencoderLab() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">A. Linear encoder/decoder — real compression &amp; reconstruction</p>
        <LinearAutoencoderDemo />
      </div>
      <div className="pt-4 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium mb-2">B. Reconstruction loss (MSE / BCE)</p>
        <ReconstructionLossDemo />
      </div>
    </div>
  );
}
