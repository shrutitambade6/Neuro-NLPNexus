import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Shuffle } from "lucide-react";

import ConceptTooltip from "../components/ConceptTooltip";
import MatrixGrid from "../components/dl/MatrixGrid";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import {
  fetchPresetKernels,
  generateRandomDense,
  runCnnForward,
  type CnnDenseWeights,
  type CnnForwardResponse,
  type CurveActivation,
} from "../services/api";

const IMAGE_SIZE = 5;
const STEP_DELAY_MS = 700;

const CONV_ACTIVATIONS: { id: CurveActivation; label: string }[] = [
  { id: "relu", label: "ReLU" },
  { id: "sigmoid", label: "Sigmoid" },
  { id: "tanh", label: "Tanh" },
  { id: "leaky_relu", label: "Leaky ReLU" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function randomImage(size: number): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.round(Math.random() * 100) / 100)
  );
}

export default function CnnLab() {
  const [image, setImage] = useState<number[][]>(() => randomImage(IMAGE_SIZE));
  const [presetKernels, setPresetKernels] = useState<Record<string, number[][]>>({});
  const [kernelName, setKernelName] = useState<string>("edge_detect");
  const [kernel, setKernel] = useState<number[][]>([
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
  ]);
  const [convActivation, setConvActivation] = useState<CurveActivation>("relu");
  const [poolType, setPoolType] = useState<"max" | "avg">("max");
  const [poolSize, setPoolSize] = useState(2);
  const [poolStride, setPoolStride] = useState(1);
  const [classLabels, setClassLabels] = useState<string[]>(["cat", "dog"]);
  const [dense, setDense] = useState<CnnDenseWeights | null>(null);
  const [result, setResult] = useState<CnnForwardResponse | null>(null);
  const [stage, setStage] = useState(0); // 0=image, 1=feature map, 2=activated, 3=pooled, 4=classified
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    fetchPresetKernels()
      .then((r) => setPresetKernels(r.kernels))
      .catch(() => setError("Couldn't load preset kernels from the backend."));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const selectKernel = (name: string) => {
    setKernelName(name);
    if (name !== "custom" && presetKernels[name]) setKernel(presetKernels[name]);
    setDense(null);
    setResult(null);
    setStage(0);
  };

  const flattenedSize = () => {
    const outH = (image.length - kernel.length) + 1;
    const pooledH = outH >= poolSize ? Math.floor((outH - poolSize) / poolStride) + 1 : 0;
    return pooledH > 0 ? pooledH * pooledH : 0;
  };

  const randomizeDense = async () => {
    const size = flattenedSize();
    if (size < 1) {
      setError("This architecture leaves no valid pooled output — widen the image or shrink the kernel/pool.");
      return;
    }
    setError(null);
    try {
      setDense(await generateRandomDense(size, classLabels.length));
      setResult(null);
      setStage(0);
    } catch {
      setError("Couldn't reach the backend.");
    }
  };

  const run = async () => {
    if (!dense) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLoading(true);
    setError(null);
    setResult(null);
    setStage(0);
    try {
      const r = await runCnnForward(image, kernel, 1, convActivation, poolType, poolSize, poolStride, dense, classLabels);
      setResult(r);
      [1, 2, 3, 4].forEach((s) => {
        const t = setTimeout(() => setStage(s), s * STEP_DELAY_MS);
        timers.current.push(t);
      });
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const animating = stage > 0 && stage < 4;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">CNN Lab</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Image → Convolution → Feature Map → Activation → Pooling → Flatten → Dense →
          Classification — every stage below is a real computation on the grid you edit: a real
          2D <ConceptTooltip term="convolution">convolution</ConceptTooltip> (multiply-and-add over each kernel window), real ReLU/sigmoid/tanh
          applied cell by cell, real max/average <ConceptTooltip term="pooling">pooling</ConceptTooltip>, and a real dense + <ConceptTooltip term="softmax">softmax</ConceptTooltip>
          classification head over randomly initialized weights (no training happens here, the
          same honest scope as the Neural Network Playground).
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="cnn-lab" label="CNN Lab" />
      <ReadInBookLink book="dl" chapterId="cnn" label="Read the CNN chapter in the DL Book" />

      <Section title="1. The input image">
        <p className="text-xs text-nexus-muted">
          A {IMAGE_SIZE}×{IMAGE_SIZE} grid of real numbers (0–1, grayscale-style). Edit any cell,
          or generate a fresh random grid.
        </p>
        <MatrixGrid
          matrix={image}
          editable
          onCellChange={(r, c, v) =>
            setImage((img) => img.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)))
          }
        />
        <button
          onClick={() => {
            setImage(randomImage(IMAGE_SIZE));
            setDense(null);
            setResult(null);
            setStage(0);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted hover:text-nexus-text"
        >
          <Shuffle size={12} /> Randomize image
        </button>
      </Section>

      <Section title="2. The kernel (filter)">
        <div className="flex flex-wrap gap-2">
          {Object.keys(presetKernels).map((name) => (
            <button
              key={name}
              onClick={() => selectKernel(name)}
              className={`rounded-full px-3 py-1 text-xs border ${
                kernelName === name
                  ? "border-nexus-accent bg-nexus-accent/20 text-nexus-text"
                  : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {name.replace(/_/g, " ")}
            </button>
          ))}
          <button
            onClick={() => setKernelName("custom")}
            className={`rounded-full px-3 py-1 text-xs border ${
              kernelName === "custom"
                ? "border-nexus-accent bg-nexus-accent/20 text-nexus-text"
                : "border-nexus-border text-nexus-muted hover:text-nexus-text"
            }`}
          >
            custom
          </button>
        </div>
        <MatrixGrid
          matrix={kernel}
          cellSize={32}
          editable
          decimals={2}
          onCellChange={(r, c, v) => {
            setKernelName("custom");
            setKernel((k) => k.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)));
          }}
        />

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="text-xs text-nexus-muted">
            Activation after convolution:{" "}
            <select
              value={convActivation}
              onChange={(e) => setConvActivation(e.target.value as CurveActivation)}
              className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
            >
              {CONV_ACTIVATIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-nexus-muted">
            Pool type:{" "}
            <select
              value={poolType}
              onChange={(e) => setPoolType(e.target.value as "max" | "avg")}
              className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
            >
              <option value="max">Max</option>
              <option value="avg">Average</option>
            </select>
          </label>
          <label className="text-xs text-nexus-muted">
            Pool size:{" "}
            <select
              value={poolSize}
              onChange={(e) => setPoolSize(Number(e.target.value))}
              className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
            >
              {[2, 3].map((n) => <option key={n} value={n}>{n}×{n}</option>)}
            </select>
          </label>
          <label className="text-xs text-nexus-muted">
            Pool stride:{" "}
            <select
              value={poolStride}
              onChange={(e) => setPoolStride(Number(e.target.value))}
              className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
            >
              {[1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </Section>

      <Section title="3. The classes">
        <div className="flex flex-wrap gap-2">
          {classLabels.map((label, i) => (
            <input
              key={i}
              value={label}
              onChange={(e) =>
                setClassLabels((labels) => labels.map((l, idx) => (idx === i ? e.target.value : l)))
              }
              className="w-24 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs text-center"
            />
          ))}
          {classLabels.length < 4 && (
            <button
              onClick={() => setClassLabels((labels) => [...labels, `class${labels.length + 1}`])}
              className="text-xs text-nexus-accent hover:underline"
            >
              + Add class
            </button>
          )}
          {classLabels.length > 2 && (
            <button
              onClick={() => setClassLabels((labels) => labels.slice(0, -1))}
              className="text-xs text-nexus-bad hover:underline"
            >
              remove
            </button>
          )}
        </div>
        <button
          onClick={randomizeDense}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white"
        >
          <Shuffle size={14} /> {dense ? "Re-randomize dense weights" : "Generate dense weights"}
        </button>
        {dense && (
          <p className="text-xs text-nexus-muted">
            Real random weights generated for a flattened input of {flattenedSize()} value(s) into{" "}
            {classLabels.length} class score(s).
          </p>
        )}
      </Section>

      {dense && (
        <Section title="4. Run the pipeline">
          <button
            onClick={run}
            disabled={loading || animating}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-good/90 hover:bg-nexus-good px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run forward pass
          </button>
          {error && <p className="text-sm text-nexus-bad">{error}</p>}

          {result && (
            <div className="space-y-4 pt-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-nexus-muted mb-1">Feature map (after convolution)</p>
                  {stage >= 1 && <MatrixGrid matrix={stage >= 2 ? result.activated_map : result.feature_map} cellSize={32} />}
                </div>
                <div>
                  <p className="text-xs text-nexus-muted mb-1">
                    Pooled map ({poolType === "max" ? "max" : "average"}-pooled)
                  </p>
                  {stage >= 3 && <MatrixGrid matrix={result.pooled_map} cellSize={32} />}
                </div>
              </div>

              {stage >= 4 && (
                <div className="space-y-2">
                  <p className="text-xs text-nexus-muted">
                    Flattened: [{result.flattened.map((v) => v.toFixed(2)).join(", ")}]
                  </p>
                  <p className="text-xs text-nexus-muted">Class scores (real softmax over the dense layer's output):</p>
                  <div className="space-y-1.5">
                    {result.class_labels.map((label, i) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-20 text-xs text-nexus-muted shrink-0">{label}</span>
                        <div className="flex-1 h-4 rounded bg-nexus-bg border border-nexus-border overflow-hidden">
                          <div
                            className={`h-full ${label === result.predicted_class ? "bg-nexus-good" : "bg-nexus-accent/60"}`}
                            style={{ width: `${result.class_scores[i] * 100}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-xs font-mono">
                          {(result.class_scores[i] * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-nexus-good/40 bg-nexus-good/10 px-4 py-3 text-sm">
                    <span className="text-nexus-muted">Predicted class: </span>
                    <span className="font-mono text-nexus-good font-semibold">{result.predicted_class}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
