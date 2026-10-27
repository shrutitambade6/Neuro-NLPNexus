import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Play, Plus, Shuffle } from "lucide-react";

import NetworkDiagram from "../components/dl/NetworkDiagram";
import LessonCompleteButton from "../components/LessonCompleteButton";
import {
  generateRandomNetwork,
  runForwardPropagation,
  type CurveActivation,
  type ForwardPropagationResponse,
  type NnLayerSpec,
  type RandomNetworkResponse,
} from "../services/api";

const ACTIVATIONS: { id: CurveActivation; label: string }[] = [
  { id: "sigmoid", label: "Sigmoid" },
  { id: "tanh", label: "Tanh" },
  { id: "relu", label: "ReLU" },
  { id: "leaky_relu", label: "Leaky ReLU" },
];

const MAX_LAYERS = 6;
const MAX_NEURONS = 8;
const MAX_INPUTS = 6;
const STEP_DELAY_MS = 650;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function NeuralNetworkPlayground() {
  const [inputSize, setInputSize] = useState(2);
  const [layers, setLayers] = useState<NnLayerSpec[]>([
    { size: 3, activation: "relu" },
    { size: 1, activation: "sigmoid" },
  ]);
  const [inputValues, setInputValues] = useState<string[]>(["1", "0.5"]);
  const [network, setNetwork] = useState<RandomNetworkResponse | null>(null);
  const [forwardResult, setForwardResult] = useState<ForwardPropagationResponse | null>(null);
  const [revealStage, setRevealStage] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const resetNetwork = () => {
    setNetwork(null);
    setForwardResult(null);
    setRevealStage(0);
  };

  const setInputSizeSafe = (next: number) => {
    if (next < 1 || next > MAX_INPUTS) return;
    setInputSize(next);
    setInputValues((v) => {
      const copy = v.slice(0, next);
      while (copy.length < next) copy.push("1");
      return copy;
    });
    resetNetwork();
  };

  const updateLayer = (i: number, patch: Partial<NnLayerSpec>) => {
    setLayers((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    resetNetwork();
  };
  const addLayer = () => {
    if (layers.length >= MAX_LAYERS) return;
    setLayers((ls) => [...ls, { size: 2, activation: "relu" }]);
    resetNetwork();
  };
  const removeLayer = (i: number) => {
    if (layers.length <= 1) return;
    setLayers((ls) => ls.filter((_, idx) => idx !== i));
    resetNetwork();
  };

  const randomize = async () => {
    setGenLoading(true);
    setError(null);
    try {
      setNetwork(await generateRandomNetwork(inputSize, layers));
      setForwardResult(null);
      setRevealStage(0);
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setGenLoading(false);
    }
  };

  const run = async () => {
    if (!network) return;
    const inputs = inputValues.map(Number);
    if (inputs.some(Number.isNaN)) {
      setError("All input values must be numbers.");
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunLoading(true);
    setError(null);
    setForwardResult(null);
    setRevealStage(0);
    try {
      const result = await runForwardPropagation(network.input_size, network.layers, inputs);
      setForwardResult(result);
      const totalStages = layers.length * 2;
      for (let stage = 1; stage <= totalStages; stage++) {
        const t = setTimeout(() => setRevealStage(stage), stage * STEP_DELAY_MS);
        timers.current.push(t);
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setRunLoading(false);
    }
  };

  const animating = revealStage > 0 && revealStage < layers.length * 2;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Neural Network Playground</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Build a real multi-layer network — set its shape, randomize real weights, then watch an
          actual forward pass flow through it, layer by layer. Every value shown is a genuine
          computation from the network's real (randomly initialized) weights and biases, not a
          decorative animation.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="neural-networks" label="Neural Networks" />

      <Section title="1. Design the architecture">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-nexus-muted">Input size</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setInputSizeSafe(inputSize - 1)} className="rounded border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text">
                <Minus size={12} />
              </button>
              <span className="text-sm font-mono w-5 text-center">{inputSize}</span>
              <button onClick={() => setInputSizeSafe(inputSize + 1)} className="rounded border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {layers.map((layer, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2">
              <span className="text-xs text-nexus-muted w-20 shrink-0">
                {i === layers.length - 1 ? "Output layer" : `Layer ${i + 1}`}
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateLayer(i, { size: Math.max(1, layer.size - 1) })} className="rounded border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text">
                  <Minus size={12} />
                </button>
                <span className="text-sm font-mono w-5 text-center">{layer.size}</span>
                <button onClick={() => updateLayer(i, { size: Math.min(MAX_NEURONS, layer.size + 1) })} className="rounded border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text">
                  <Plus size={12} />
                </button>
                <span className="text-[10px] text-nexus-muted ml-1">neurons</span>
              </div>
              <select
                value={layer.activation}
                onChange={(e) => updateLayer(i, { activation: e.target.value as CurveActivation })}
                className="rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
              >
                {ACTIVATIONS.map((a) => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
              {layers.length > 1 && (
                <button onClick={() => removeLayer(i)} className="ml-auto text-[11px] text-nexus-bad hover:underline">
                  remove
                </button>
              )}
            </div>
          ))}
          <button onClick={addLayer} disabled={layers.length >= MAX_LAYERS} className="text-xs text-nexus-accent hover:underline disabled:opacity-40 disabled:hover:no-underline">
            + Add layer
          </button>
        </div>

        <button
          onClick={randomize}
          disabled={genLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
          {network ? "Re-randomize weights" : "Randomize weights"}
        </button>
        {network && (
          <p className="text-xs text-nexus-muted">
            Real weights generated for this exact architecture — every edge in the diagram below has
            its own random weight, every neuron its own random bias.
          </p>
        )}
      </Section>

      {network && (
        <Section title="2. Set the inputs and run a forward pass">
          <div className="flex flex-wrap gap-2">
            {inputValues.map((v, i) => (
              <input
                key={i}
                value={v}
                onChange={(e) => setInputValues((vals) => vals.map((val, idx) => (idx === i ? e.target.value : val)))}
                className="w-20 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
                placeholder={`x${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={run}
            disabled={runLoading || animating}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-good/90 hover:bg-nexus-good px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run forward pass
          </button>

          {error && <p className="text-sm text-nexus-bad">{error}</p>}

          <NetworkDiagram
            inputSize={network.input_size}
            layerSizes={layers.map((l) => l.size)}
            revealStage={revealStage}
            inputValues={forwardResult ? forwardResult.input_values : null}
            forwardResult={forwardResult}
          />
          <p className="text-xs text-nexus-muted">
            Gold nodes = weighted sum (z) just computed. Green nodes = activation applied — that
            value then flows out as the next layer's input. The final column's value is the
            network's prediction.
          </p>

          {forwardResult && revealStage >= layers.length * 2 && (
            <div className="rounded-xl border border-nexus-good/40 bg-nexus-good/10 px-4 py-3 text-sm">
              <span className="text-nexus-muted">Prediction (final layer output): </span>
              <span className="font-mono text-nexus-good font-semibold">
                [{forwardResult.output.map((o) => o.toFixed(4)).join(", ")}]
              </span>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
