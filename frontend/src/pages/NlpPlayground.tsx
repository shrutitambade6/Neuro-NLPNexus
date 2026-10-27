import { useState } from "react";
import { AlertCircle, ArrowRight, GripVertical, Loader2, X } from "lucide-react";

import LessonCompleteButton from "../components/LessonCompleteButton";
import {
  comparePlaygroundPipelines,
  runPlaygroundPipeline,
  type PipelineCompareResponse,
  type PipelineRunResponse,
} from "../services/api";

// Local Card / TheoryBlock helpers mirror the pattern used across the other
// lab pages (kept local, not imported, so nothing else is coupled to this file).
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function TheoryBlock({
  definition,
  simple,
  whyItMatters,
}: {
  definition: React.ReactNode;
  simple: string;
  whyItMatters?: string;
}) {
  return (
    <div className="text-sm text-nexus-muted space-y-2 leading-relaxed">
      <p><strong className="text-nexus-text">Definition: </strong>{definition}</p>
      <p><strong className="text-nexus-text">Simple meaning: </strong>{simple}</p>
      {whyItMatters && <p><strong className="text-nexus-text">Why NLP uses it: </strong>{whyItMatters}</p>}
    </div>
  );
}

const AVAILABLE_STAGES = [
  { id: "lowercase", label: "Lowercase" },
  { id: "remove_stopwords", label: "Remove stopwords" },
  { id: "stem", label: "Porter stem" },
  { id: "lemmatize", label: "Lemmatize" },
];

export default function NlpPlayground() {
  const [text, setText] = useState("The Cats are Running quickly through the gardens.");
  const [tokenizer, setTokenizer] = useState<"whitespace" | "regex">("whitespace");
  const [stages, setStages] = useState<string[]>(["lowercase", "stem"]);
  const [result, setResult] = useState<PipelineRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleStage = (id: string) => {
    setStages((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };
  const moveStage = (index: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  const removeStage = (index: number) => setStages((prev) => prev.filter((_, i) => i !== index));

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await runPlaygroundPipeline(text, tokenizer, stages));
    } catch {
      setError("Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.");
    } finally {
      setLoading(false);
    }
  };

  // --- Compare mode ---
  const [compareOn, setCompareOn] = useState(false);
  const [textB, setTextB] = useState("The cat ran quickly through the garden.");
  const [compareResult, setCompareResult] = useState<PipelineCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const runCompare = async () => {
    if (!text.trim() || !textB.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      setCompareResult(await comparePlaygroundPipelines(text, textB, tokenizer, stages));
    } catch {
      setCompareError("Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.");
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">NLP Playground</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Chain real preprocessing stages together and watch the token list change after each one.
          Every stage here calls the exact same backend functions as the Text Processing and
          Semantic Lab pages — this is composition, not a new implementation.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="nlp-playground" label="NLP Playground" />

      <Card title="How the pipeline works">
        <TheoryBlock
          definition="A processing pipeline runs text through an ordered sequence of transformations, where each stage's output feeds the next stage's input."
          simple="Pick which stages to apply and in what order, then watch the token list evolve stage by stage."
          whyItMatters="Real NLP systems chain exactly these kinds of steps (tokenize → normalize → stem/lemmatize → analyze) before any downstream task — the order and choice of stages measurably changes results, which the Compare mode below demonstrates directly."
        />
      </Card>

      <Card title="Build your pipeline">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Enter text…"
        />

        <div className="flex items-center gap-3">
          <label className="text-sm text-nexus-text font-medium">Tokenizer:</label>
          {(["whitespace", "regex"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTokenizer(t)}
              className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                tokenizer === t
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                  : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <p className="text-xs text-nexus-muted mb-1.5">Available stages (click to add):</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleStage(s.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  stages.includes(s.id)
                    ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                    : "border-nexus-border text-nexus-muted hover:text-nexus-text"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {stages.length > 0 && (
          <div>
            <p className="text-xs text-nexus-muted mb-1.5">Pipeline order (top to bottom):</p>
            <div className="space-y-1">
              {stages.map((id, i) => (
                <div
                  key={`${id}-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-1.5 text-xs"
                >
                  <GripVertical size={12} className="text-nexus-muted shrink-0" />
                  <span className="text-nexus-muted w-4">{i + 1}.</span>
                  <span className="flex-1 text-nexus-text font-medium">
                    {AVAILABLE_STAGES.find((s) => s.id === id)?.label ?? id}
                  </span>
                  <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-nexus-muted hover:text-nexus-text disabled:opacity-20">
                    ↑
                  </button>
                  <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} className="text-nexus-muted hover:text-nexus-text disabled:opacity-20">
                    ↓
                  </button>
                  <button onClick={() => removeStage(i)} className="text-nexus-muted hover:text-nexus-bad">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Run pipeline
        </button>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {result && (
        <Card title="Step-by-step trace">
          <div className="space-y-2">
            {result.trace.map((step, i) => (
              <div key={i} className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
                <p className="text-[11px] uppercase tracking-wide text-nexus-accent mb-1.5">{step.stage}</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.tokens.length === 0 ? (
                    <span className="text-xs text-nexus-muted italic">(no tokens remaining)</span>
                  ) : (
                    step.tokens.map((tok, j) => (
                      <span key={j} className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1">
                        {tok}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Compare mode — does preprocessing change similarity?">
        <p className="text-xs text-nexus-muted">
          Run the same pipeline (stages above) on two texts and measure real Jaccard and cosine
          similarity between the results — reusing the exact functions the Semantic Lab uses.
        </p>
        <button
          onClick={() => setCompareOn((c) => !c)}
          className="text-xs text-nexus-accent hover:text-nexus-data font-medium"
        >
          {compareOn ? "Hide compare mode" : "Enable compare mode"}
        </button>

        {compareOn && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-nexus-muted w-16">Text A:</span>
              <span className="text-xs font-mono text-nexus-text truncate flex-1">{text}</span>
            </div>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
              placeholder="Text B…"
            />
            <button
              onClick={runCompare}
              disabled={compareLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-nexus-border px-4 py-2 text-sm font-medium text-nexus-text hover:border-nexus-accentDim disabled:opacity-50"
            >
              {compareLoading && <Loader2 size={14} className="animate-spin" />}
              Compare
            </button>
            {compareError && <p className="text-sm text-nexus-bad">{compareError}</p>}

            {compareResult && (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-nexus-accent mb-1.5">Final tokens A</p>
                    <div className="flex flex-wrap gap-1.5">
                      {compareResult.pipeline_a.final_tokens.map((t, i) => (
                        <span key={i} className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-nexus-accent mb-1.5">Final tokens B</p>
                    <div className="flex flex-wrap gap-1.5">
                      {compareResult.pipeline_b.final_tokens.map((t, i) => (
                        <span key={i} className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-nexus-muted">Jaccard:</span>
                  <span className="font-mono text-nexus-accent">{compareResult.jaccard.jaccard.toFixed(3)}</span>
                  <ArrowRight size={12} className="text-nexus-muted" />
                  <span className="text-nexus-muted">Cosine:</span>
                  <span className="font-mono text-nexus-accent">{compareResult.cosine.cosine_similarity.toFixed(3)}</span>
                </div>
                <p className="text-xs text-nexus-muted">
                  Shared vocabulary after this pipeline: {compareResult.vocab.join(", ") || "(none)"}
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
