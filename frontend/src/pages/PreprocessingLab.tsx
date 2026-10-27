import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import {
  analyzeMorphology,
  computeEditDistance,
  tokenize,
  type EditDistanceResponse,
  type MorphologyResponse,
  type TokenizeResponse,
} from "../services/api";

const METHOD_LABELS: Record<string, string> = {
  whitespace: "Whitespace",
  rule_based: "Rule-based",
  regex: "Regex",
  sentences: "Sentence",
};

// Local Card helper mirrors the pattern already used in SemanticLab.tsx /
// DiscourseLab.tsx. The full TheoryBlock (definition/simple/example/why/
// common-mistake) that used to live here moved to the NLP Book's
// "Text Preprocessing" chapter (point 6/20 of the migration) — this page
// keeps only short intros next to each interactive tool plus a
// "Read in NLP Book" link, per ReadInBookLink below.
function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function PreprocessingLab() {
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // --- Tokenization (pre-existing, unchanged) ---
  const [text, setText] = useState("The students are studying NLP.");
  const [result, setResult] = useState<TokenizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tokenize(text);
      setResult(data);
    } catch {
      setError("Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.");
    } finally {
      setLoading(false);
    }
  };

  // --- Stemming / Lemmatization / Morphology ---
  const [morphInput, setMorphInput] = useState("running studies unhappiness electrical agreed");
  const [morphResult, setMorphResult] = useState<MorphologyResponse | null>(null);
  const [morphLoading, setMorphLoading] = useState(false);
  const [morphError, setMorphError] = useState<string | null>(null);

  const runMorphology = async () => {
    const words = morphInput.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    setMorphLoading(true);
    setMorphError(null);
    try {
      setMorphResult(await analyzeMorphology(words));
    } catch {
      setMorphError("Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.");
    } finally {
      setMorphLoading(false);
    }
  };

  // --- Edit distance / DP matrix animation ---
  const [editSource, setEditSource] = useState("kitten");
  const [editTarget, setEditTarget] = useState("sitting");
  const [editResult, setEditResult] = useState<EditDistanceResponse | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fillStep, setFillStep] = useState(0); // how many cells (row-major) revealed
  const [playing, setPlaying] = useState(false);
  const [showBacktrace, setShowBacktrace] = useState(false);
  const playInterval = useRef<number | null>(null);

  const runEditDistance = async () => {
    if (!editSource.trim() || !editTarget.trim()) return;
    setEditLoading(true);
    setEditError(null);
    setPlaying(false);
    setShowBacktrace(false);
    try {
      const data = await computeEditDistance(editSource, editTarget);
      setEditResult(data);
      setFillStep(0);
    } catch {
      setEditError("Couldn't reach the backend. Is it running? See README for `uvicorn app.main:app`.");
    } finally {
      setEditLoading(false);
    }
  };

  const totalCells = editResult ? editResult.matrix.length * editResult.matrix[0].length : 0;

  useEffect(() => {
    if (playing && editResult) {
      playInterval.current = window.setInterval(() => {
        setFillStep((s) => {
          if (s >= totalCells) {
            setPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 80);
    }
    return () => {
      if (playInterval.current) window.clearInterval(playInterval.current);
    };
  }, [playing, editResult, totalCells]);

  const cellRevealed = (i: number, j: number) => {
    if (!editResult) return false;
    const cols = editResult.matrix[0].length;
    return i * cols + j < fillStep;
  };

  const onBacktracePath = (i: number, j: number) => {
    if (!editResult) return false;
    let si = editResult.matrix.length - 1;
    let sj = editResult.matrix[0].length - 1;
    if (si === i && sj === j) return true;
    for (const op of [...editResult.operations].reverse()) {
      if (op.op === "match" || op.op === "substitute") {
        si -= 1;
        sj -= 1;
      } else if (op.op === "delete") {
        si -= 1;
      } else {
        sj -= 1;
      }
      if (si === i && sj === j) return true;
    }
    return false;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Text Preprocessing Lab</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Tokenization, stemming, lemmatization, morphology, and edit distance — the ground-floor
          text-processing steps every later lab builds on. All real backend calls, not canned examples.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="preprocessing" label="Text Processing" />

      <Card title="Tokenization" id="tokenization">
        <p className="text-xs text-nexus-muted">
          Compare how four different tokenization strategies split the same sentence.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Enter a sentence to tokenize…"
        />
        <button
          onClick={handleRun}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Run tokenizers
        </button>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(result.tokens) as Array<keyof typeof result.tokens>).map((method) => (
              <div key={method} className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{METHOD_LABELS[method]}</h3>
                  <span className="text-[11px] text-nexus-muted">
                    {result.token_counts[method]} {method === "sentences" ? "sentences" : "tokens"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.tokens[method].map((tok, i) => (
                    <span
                      key={`${tok}-${i}`}
                      className="rounded-md bg-nexus-data/10 text-nexus-data text-xs font-mono px-2 py-1"
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Stemming & Lemmatization" id="morphology">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Stemming chops a word to a rough root (studies → studi); lemmatization
          returns a real dictionary form (studies → study).
        </p>
        <ReadInBookLink book="nlp" chapterId="text-preprocessing" />
        <div className="flex gap-2">
          <input
            value={morphInput}
            onChange={(e) => setMorphInput(e.target.value)}
            className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            placeholder="Space-separated words…"
          />
          <button
            onClick={runMorphology}
            disabled={morphLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 shrink-0"
          >
            {morphLoading && <Loader2 size={14} className="animate-spin" />}
            Analyze
          </button>
        </div>

        {morphError && <p className="text-sm text-nexus-bad">{morphError}</p>}

        {morphResult && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-nexus-muted text-left border-b border-nexus-border">
                  <th className="py-2 pr-4">Word</th>
                  <th className="py-2 pr-4">Stem (Porter)</th>
                  <th className="py-2 pr-4">Lemma</th>
                  <th className="py-2 pr-4">Lemma method</th>
                  <th className="py-2">Morphology (prefix + root + suffix)</th>
                </tr>
              </thead>
              <tbody>
                {morphResult.results.map((r) => (
                  <tr key={r.word} className="border-b border-nexus-border/50 text-nexus-muted">
                    <td className="py-1.5 pr-4 font-mono text-nexus-text">{r.word}</td>
                    <td className="py-1.5 pr-4 font-mono">{r.stem}</td>
                    <td className="py-1.5 pr-4 font-mono">{r.lemma}</td>
                    <td className="py-1.5 pr-4">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          r.lemma_method === "unchanged"
                            ? "bg-nexus-warn/10 text-nexus-warn"
                            : "bg-nexus-good/10 text-nexus-good"
                        }`}
                      >
                        {r.lemma_method}
                      </span>
                    </td>
                    <td className="py-1.5 font-mono">
                      {r.prefix && <span className="text-nexus-purple">{r.prefix}</span>}
                      <span className="text-nexus-text">{r.root}</span>
                      {r.suffix && <span className="text-nexus-data">{r.suffix}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Edit Distance (Levenshtein) — DP matrix">
        <p className="text-sm text-nexus-muted leading-relaxed">
          The minimum single-character edits (insert/delete/substitute) to turn
          one string into another, computed by dynamic programming.
        </p>
        <ReadInBookLink book="nlp" chapterId="text-preprocessing" label="Read full Edit Distance explanation in the NLP Book" />
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={editSource}
            onChange={(e) => setEditSource(e.target.value)}
            className="w-32 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            placeholder="source"
          />
          <span className="text-nexus-muted text-sm">→</span>
          <input
            value={editTarget}
            onChange={(e) => setEditTarget(e.target.value)}
            className="w-32 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            placeholder="target"
          />
          <button
            onClick={runEditDistance}
            disabled={editLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            {editLoading && <Loader2 size={14} className="animate-spin" />}
            Compute
          </button>
        </div>

        {editError && <p className="text-sm text-nexus-bad">{editError}</p>}

        {editResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying((p) => !p)}
                disabled={fillStep >= totalCells}
                className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim disabled:opacity-30"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => setFillStep((s) => Math.min(s + 1, totalCells))}
                className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
              >
                <SkipForward size={14} />
              </button>
              <button
                onClick={() => {
                  setFillStep(0);
                  setPlaying(false);
                  setShowBacktrace(false);
                }}
                className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
              >
                <RotateCcw size={14} />
              </button>
              <span className="text-xs text-nexus-muted">
                Filling cell {Math.min(fillStep, totalCells)} of {totalCells}
              </span>
              {fillStep >= totalCells && (
                <button
                  onClick={() => setShowBacktrace((b) => !b)}
                  className="ml-auto rounded-lg border border-nexus-border px-3 py-1 text-xs text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
                >
                  {showBacktrace ? "Hide" : "Show"} optimal-path backtrace
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="border-collapse text-xs font-mono">
                <thead>
                  <tr>
                    <td></td>
                    <td className="px-2 py-1 text-nexus-muted"></td>
                    {editResult.target.split("").map((ch, j) => (
                      <td key={j} className="px-2 py-1 text-center text-nexus-accent">{ch}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editResult.matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1 text-nexus-accent text-center">
                        {i === 0 ? "" : editResult.source[i - 1]}
                      </td>
                      {row.map((val, j) => {
                        const revealed = cellRevealed(i, j);
                        const onPath = showBacktrace && onBacktracePath(i, j);
                        return (
                          <td
                            key={j}
                            className={`w-7 h-7 text-center border border-nexus-border transition-colors ${
                              !revealed
                                ? "bg-nexus-bg text-transparent"
                                : onPath
                                ? "bg-nexus-good/30 text-nexus-good font-semibold"
                                : "bg-nexus-surfaceAlt text-nexus-text"
                            }`}
                          >
                            {revealed ? val : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-nexus-text">
              Edit distance = <span className="font-mono text-nexus-accent">{editResult.distance}</span>
            </p>

            {fillStep >= totalCells && (
              <div className="flex flex-wrap gap-1.5">
                {editResult.operations.map((op, i) => (
                  <span
                    key={i}
                    className={`rounded-md px-2 py-1 text-[11px] font-mono border ${
                      op.op === "match"
                        ? "border-nexus-border text-nexus-muted"
                        : op.op === "substitute"
                        ? "border-nexus-warn/40 bg-nexus-warn/10 text-nexus-warn"
                        : op.op === "delete"
                        ? "border-nexus-bad/40 bg-nexus-bad/10 text-nexus-bad"
                        : "border-nexus-good/40 bg-nexus-good/10 text-nexus-good"
                    }`}
                  >
                    {op.op === "match" && `= ${op.source_char}`}
                    {op.op === "substitute" && `${op.source_char}→${op.target_char}`}
                    {op.op === "delete" && `−${op.source_char}`}
                    {op.op === "insert" && `+${op.target_char}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
