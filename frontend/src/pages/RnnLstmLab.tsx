import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Shuffle } from "lucide-react";

import ConceptTooltip from "../components/ConceptTooltip";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import {
  generateRandomLstm,
  generateRandomRnn,
  runLstmForward,
  runRnnForward,
  type CurveActivation,
  type LstmForwardResponse,
  type LstmWeightsIO,
  type RnnForwardResponse,
  type RnnWeightsIO,
} from "../services/api";

const STEP_DELAY_MS = 800;
const INPUT_SIZE = 2;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(1, (value + 1) / 2)) * 100; // map [-1,1] -> [0,100]
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[10px] text-nexus-muted shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded bg-nexus-bg border border-nexus-border overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-[10px] font-mono">{value.toFixed(2)}</span>
    </div>
  );
}

export default function RnnLstmLab() {
  const [mode, setMode] = useState<"rnn" | "lstm">("rnn");
  const [hiddenSize, setHiddenSize] = useState(3);
  const [outputSize, setOutputSize] = useState(2);
  const [activation, setActivation] = useState<CurveActivation>("tanh");
  const [sequence, setSequence] = useState<number[][]>([
    [1, 0],
    [0, 1],
    [1, 1],
  ]);

  const [rnnWeights, setRnnWeights] = useState<RnnWeightsIO | null>(null);
  const [lstmWeights, setLstmWeights] = useState<LstmWeightsIO | null>(null);
  const [rnnResult, setRnnResult] = useState<RnnForwardResponse | null>(null);
  const [lstmResult, setLstmResult] = useState<LstmForwardResponse | null>(null);
  const [revealStep, setRevealStep] = useState(-1);
  const [genLoading, setGenLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const resetOutputs = () => {
    setRnnWeights(null);
    setLstmWeights(null);
    setRnnResult(null);
    setLstmResult(null);
    setRevealStep(-1);
  };

  const switchMode = (m: "rnn" | "lstm") => {
    setMode(m);
    resetOutputs();
  };

  const updateCell = (t: number, i: number, v: number) =>
    setSequence((seq) => seq.map((row, ti) => (ti === t ? row.map((c, ci) => (ci === i ? v : c)) : row)));

  const addTimestep = () => {
    if (sequence.length >= 6) return;
    setSequence((seq) => [...seq, Array(INPUT_SIZE).fill(0)]);
    resetOutputs();
  };
  const removeTimestep = () => {
    if (sequence.length <= 1) return;
    setSequence((seq) => seq.slice(0, -1));
    resetOutputs();
  };

  const randomize = async () => {
    setGenLoading(true);
    setError(null);
    try {
      if (mode === "rnn") {
        setRnnWeights(await generateRandomRnn(INPUT_SIZE, hiddenSize, outputSize));
      } else {
        setLstmWeights(await generateRandomLstm(INPUT_SIZE, hiddenSize));
      }
      setRnnResult(null);
      setLstmResult(null);
      setRevealStep(-1);
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setGenLoading(false);
    }
  };

  const run = async () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunLoading(true);
    setError(null);
    setRnnResult(null);
    setLstmResult(null);
    setRevealStep(-1);
    try {
      if (mode === "rnn" && rnnWeights) {
        const r = await runRnnForward(rnnWeights, sequence, activation, "softmax");
        setRnnResult(r);
      } else if (mode === "lstm" && lstmWeights) {
        const r = await runLstmForward(lstmWeights, sequence);
        setLstmResult(r);
      }
      sequence.forEach((_, idx) => {
        const t = setTimeout(() => setRevealStep(idx), (idx + 1) * STEP_DELAY_MS);
        timers.current.push(t);
      });
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setRunLoading(false);
    }
  };

  const weights = mode === "rnn" ? rnnWeights : lstmWeights;
  const animating = revealStep >= 0 && revealStep < sequence.length - 1;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">RNN &amp; LSTM Lab</h1>
        <p className="text-nexus-muted text-sm mt-1">
          A real recurrent forward pass over a short sequence. In Simple RNN mode, each step's
          real previous hidden state genuinely feeds back into the next (h<sub>t</sub> =
          activation(W<sub>xh</sub>·x<sub>t</sub> + W<sub>hh</sub>·h<sub>t−1</sub> + b<sub>h</sub>)).
          In LSTM mode, all four real <ConceptTooltip term="lstmGate">gates</ConceptTooltip> — forget, input, candidate, output — are computed at
          every step from the real previous hidden and cell state, and genuinely update the cell
          state before deriving the new hidden state. Weights are randomly initialized, not
          trained — this lab is about how the <ConceptTooltip term="recurrence">recurrence</ConceptTooltip> and gating actually compute.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="rnn-lstm-lab" label="RNN & LSTM Lab" />
      <ReadInBookLink book="dl" chapterId="rnn-and-lstm" label="Read the RNN & LSTM chapter in the DL Book" />

      <Section title="1. Choose a cell type and sequence">
        <div className="flex gap-2">
          <button
            onClick={() => switchMode("rnn")}
            className={`rounded-lg px-3 py-1.5 text-xs border ${mode === "rnn" ? "border-nexus-accent bg-nexus-accent/20 text-nexus-text" : "border-nexus-border text-nexus-muted"}`}
          >
            Simple RNN
          </button>
          <button
            onClick={() => switchMode("lstm")}
            className={`rounded-lg px-3 py-1.5 text-xs border ${mode === "lstm" ? "border-nexus-accent bg-nexus-accent/20 text-nexus-text" : "border-nexus-border text-nexus-muted"}`}
          >
            LSTM
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-nexus-muted">
            Hidden size:{" "}
            <select
              value={hiddenSize}
              onChange={(e) => {
                setHiddenSize(Number(e.target.value));
                resetOutputs();
              }}
              className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
            >
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {mode === "rnn" && (
            <>
              <label className="text-xs text-nexus-muted">
                Output size:{" "}
                <select
                  value={outputSize}
                  onChange={(e) => {
                    setOutputSize(Number(e.target.value));
                    resetOutputs();
                  }}
                  className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
                >
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs text-nexus-muted">
                Hidden activation:{" "}
                <select
                  value={activation}
                  onChange={(e) => {
                    setActivation(e.target.value as CurveActivation);
                    resetOutputs();
                  }}
                  className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
                >
                  <option value="tanh">Tanh</option>
                  <option value="sigmoid">Sigmoid</option>
                  <option value="relu">ReLU</option>
                </select>
              </label>
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-nexus-muted">Sequence (each timestep is a 2-value input vector):</p>
          {sequence.map((x, t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="w-10 text-[10px] text-nexus-muted">t={t + 1}</span>
              {x.map((v, i) => (
                <input
                  key={i}
                  value={v}
                  onChange={(e) => updateCell(t, i, Number(e.target.value))}
                  className="w-16 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs font-mono text-center"
                />
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={addTimestep} disabled={sequence.length >= 6} className="text-xs text-nexus-accent hover:underline disabled:opacity-40">
              + Add timestep
            </button>
            <button onClick={removeTimestep} disabled={sequence.length <= 1} className="text-xs text-nexus-bad hover:underline disabled:opacity-40">
              − Remove timestep
            </button>
          </div>
        </div>

        <button
          onClick={randomize}
          disabled={genLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
          {weights ? "Re-randomize weights" : "Randomize weights"}
        </button>
      </Section>

      {weights && (
        <Section title="2. Run the recurrence">
          <button
            onClick={run}
            disabled={runLoading || animating}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-good/90 hover:bg-nexus-good px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run forward pass
          </button>
          {error && <p className="text-sm text-nexus-bad">{error}</p>}

          {mode === "rnn" && rnnResult && (
            <div className="space-y-3 pt-2">
              {rnnResult.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 space-y-1.5 transition-opacity duration-300 ${
                    idx <= revealStep ? "opacity-100 border-nexus-accent/40 bg-nexus-accent/5" : "opacity-30 border-nexus-border"
                  }`}
                >
                  <p className="text-xs text-nexus-muted">
                    t={idx + 1} — x=[{step.x.join(", ")}]
                  </p>
                  {step.h.map((h, i) => (
                    <Bar key={i} label={`h${i + 1}`} value={h} color="bg-nexus-accent" />
                  ))}
                  {idx <= revealStep && (
                    <p className="text-[10px] text-nexus-muted">y = [{step.y.map((v) => v.toFixed(3)).join(", ")}]</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === "lstm" && lstmResult && (
            <div className="space-y-3 pt-2">
              {lstmResult.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 space-y-1.5 transition-opacity duration-300 ${
                    idx <= revealStep ? "opacity-100 border-nexus-accent/40 bg-nexus-accent/5" : "opacity-30 border-nexus-border"
                  }`}
                >
                  <p className="text-xs text-nexus-muted">
                    t={idx + 1} — x=[{step.x.join(", ")}]
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                    {step.forget_gate.map((v, i) => <Bar key={`f${i}`} label={`f${i + 1}`} value={v * 2 - 1} color="bg-nexus-warn" />)}
                    {step.input_gate.map((v, i) => <Bar key={`i${i}`} label={`i${i + 1}`} value={v * 2 - 1} color="bg-nexus-good" />)}
                    {step.candidate.map((v, i) => <Bar key={`c${i}`} label={`c̃${i + 1}`} value={v} color="bg-nexus-accent" />)}
                    {step.output_gate.map((v, i) => <Bar key={`o${i}`} label={`o${i + 1}`} value={v * 2 - 1} color="bg-nexus-bad" />)}
                  </div>
                  {idx <= revealStep && (
                    <p className="text-[10px] text-nexus-muted">
                      h = [{step.hidden_state.map((v) => v.toFixed(3)).join(", ")}] &nbsp; c = [{step.cell_state.map((v) => v.toFixed(3)).join(", ")}]
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
