import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { fetchTruthTable, mpNeuron, type LogicGate, type MPNeuronResponse, type TruthTableResponse } from "../../services/api";

const GATES: LogicGate[] = ["AND", "OR", "NOT"];

// The McCulloch-Pitts neuron (chap_01.docx §1-2): fires (output 1) iff the
// weighted sum of its inputs meets or exceeds a fixed threshold — real
// arithmetic on whatever inputs/weights/threshold the student enters, via
// backend/app/algorithms/perceptron_foundations.py.
export default function MPNeuronCalculator() {
  const [inputs, setInputs] = useState<string[]>(["1", "1"]);
  const [weights, setWeights] = useState<string[]>(["1", "1"]);
  const [threshold, setThreshold] = useState("2");
  const [result, setResult] = useState<MPNeuronResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gate, setGate] = useState<LogicGate>("AND");
  const [table, setTable] = useState<TruthTableResponse | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  const run = async () => {
    const parsedInputs = inputs.map(Number);
    const parsedWeights = weights.map(Number);
    const parsedThreshold = Number(threshold);
    if (parsedInputs.some(Number.isNaN) || parsedWeights.some(Number.isNaN) || Number.isNaN(parsedThreshold)) {
      setError("Inputs, weights, and threshold must all be numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await mpNeuron(parsedInputs, parsedWeights, parsedThreshold));
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchTruthTable(gate)
      .then((res) => {
        if (!cancelled) setTable(res);
      })
      .catch(() => {
        if (!cancelled) setTableError("Couldn't reach the backend.");
      });
    return () => {
      cancelled = true;
    };
  }, [gate]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium">Try any inputs, weights, threshold</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-nexus-muted mb-1 block">Inputs (0 or 1)</label>
            <div className="flex gap-1.5">
              {inputs.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => setInputs((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                  className="w-14 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-nexus-muted mb-1 block">Weights</label>
            <div className="flex gap-1.5">
              {weights.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => setWeights((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                  className="w-14 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-nexus-muted mb-1 block">Threshold</label>
            <input
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-20 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            />
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Fire the neuron
        </button>
        {error && <p className="text-sm text-nexus-bad">{error}</p>}
        {result && (
          <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-2">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-nexus-muted">weighted sum: </span>
                <span className="font-mono text-nexus-data">{result.weighted_sum.toFixed(4)}</span>
              </div>
              <div>
                <span className="text-nexus-muted">output: </span>
                <span className={`font-mono font-semibold ${result.fired ? "text-nexus-good" : "text-nexus-bad"}`}>
                  {result.fired ? "1 (fires)" : "0 (does not fire)"}
                </span>
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

      <div className="space-y-2 pt-2 border-t border-nexus-border/60">
        <p className="text-xs uppercase tracking-wide text-nexus-muted font-medium">Logic gates as M-P neurons (§2.3-2.5)</p>
        <div className="flex gap-2">
          {GATES.map((g) => (
            <button
              key={g}
              onClick={() => setGate(g)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                gate === g ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text" : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        {tableError && <p className="text-sm text-nexus-bad">{tableError}</p>}
        {table && (
          <div className="overflow-x-auto rounded-xl border border-nexus-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-nexus-muted text-left border-b border-nexus-border bg-nexus-surfaceAlt">
                  {table.rows[0].inputs.map((_, i) => (
                    <th key={i} className="py-2 px-3">x{i + 1}</th>
                  ))}
                  <th className="py-2 px-3">weighted sum</th>
                  <th className="py-2 px-3">output</th>
                </tr>
              </thead>
              <tbody className="text-nexus-muted">
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-nexus-border/50 last:border-0">
                    {row.inputs.map((x, j) => (
                      <td key={j} className="py-2 px-3 font-mono">{x}</td>
                    ))}
                    <td className="py-2 px-3 font-mono">{row.weighted_sum}</td>
                    <td className={`py-2 px-3 font-mono font-semibold ${row.output ? "text-nexus-good" : "text-nexus-text"}`}>{row.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 text-xs text-nexus-muted border-t border-nexus-border bg-nexus-surfaceAlt/50">
              weights = {JSON.stringify(table.weights)}, threshold = {table.threshold} — real M-P neurons producing every row above, not a lookup table.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
