import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  XCircle,
} from "lucide-react";

import CYKChart from "../components/CYKChart";
import ParseTreeGraph from "../components/ParseTreeGraph";
import TopDownDerivation from "../components/TopDownDerivation";
import ConceptTooltip from "../components/ConceptTooltip";
import ReadInBookLink from "../components/ReadInBookLink";
import LessonCompleteButton from "../components/LessonCompleteButton";
import {
  parseCYK,
  parseTopDown,
  type CYKResponse,
  type ParseTreeNode,
  type TopDownResponse,
} from "../services/api";

const PRESETS = [
  "The students watch the movie.",
  "A dog sees the cat.",
  "The teacher reads a book.",
];

type Status = "idle" | "running" | "done" | "error";

function countNodes(node: ParseTreeNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

export default function ParsingLab() {
  const [sentence, setSentence] = useState(PRESETS[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cykResult, setCykResult] = useState<CYKResponse | null>(null);
  const [topDownResult, setTopDownResult] = useState<TopDownResponse | null>(null);

  // Bottom-Up reveal state (span-based, same mechanic the lab already had).
  const [revealedSpans, setRevealedSpans] = useState(0);
  const [buPlaying, setBuPlaying] = useState(false);
  const buIntervalRef = useRef<number | null>(null);
  const maxSpan = cykResult ? cykResult.tokens.length : 0;

  // Top-Down reveal state (one derivation step at a time).
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [tdPlaying, setTdPlaying] = useState(false);
  const tdIntervalRef = useRef<number | null>(null);
  const maxSteps = topDownResult ? topDownResult.steps.length : 0;

  const run = async () => {
    if (!sentence.trim()) return;
    setStatus("running");
    setErrorMessage(null);
    setCykResult(null);
    setTopDownResult(null);
    setRevealedSpans(0);
    setRevealedSteps(0);
    setBuPlaying(false);
    setTdPlaying(false);
    try {
      // Same sentence, same grammar, both algorithms — run together so the
      // comparison is of the two approaches, not of two separate attempts.
      const [cyk, topDown] = await Promise.all([parseCYK(sentence), parseTopDown(sentence)]);
      setCykResult(cyk);
      setTopDownResult(topDown);
      setRevealedSpans(1);
      setRevealedSteps(1);
      setStatus("done");
    } catch {
      setErrorMessage("Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (buPlaying && cykResult) {
      buIntervalRef.current = window.setInterval(() => {
        setRevealedSpans((r) => {
          if (r >= maxSpan) {
            setBuPlaying(false);
            return r;
          }
          return r + 1;
        });
      }, 700);
    }
    return () => {
      if (buIntervalRef.current) window.clearInterval(buIntervalRef.current);
    };
  }, [buPlaying, cykResult, maxSpan]);

  useEffect(() => {
    if (tdPlaying && topDownResult) {
      tdIntervalRef.current = window.setInterval(() => {
        setRevealedSteps((r) => {
          if (r >= maxSteps) {
            setTdPlaying(false);
            return r;
          }
          return r + 1;
        });
      }, 700);
    }
    return () => {
      if (tdIntervalRef.current) window.clearInterval(tdIntervalRef.current);
    };
  }, [tdPlaying, topDownResult, maxSteps]);

  const bottomUpTreeRevealedCount =
    cykResult?.tree && maxSpan > 0
      ? Math.ceil((Math.min(revealedSpans, maxSpan) / maxSpan) * countNodes(cykResult.tree))
      : 0;

  const unknownWords = cykResult?.unknown_words ?? topDownResult?.unknown_words ?? [];
  const grammarSummary = cykResult?.grammar_summary ?? topDownResult?.grammar_summary ?? null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">Parsing Lab — Bottom-Up vs Top-Down</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Two real, independently computed parsers — a{" "}
          <ConceptTooltip term="cnf">CYK</ConceptTooltip> bottom-up chart parser and a genuine
          top-down (leftmost-derivation) parser — run against the exact same sentence and the
          exact same fixed educational grammar (simple Det-N-V sentences), so you can see how two
          different strategies reach the same structure. Nothing below is precomputed: both panels
          only fill in once you click Run.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="parsing" label="Parsing Lab" />

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
        <div className="flex flex-wrap gap-2 mb-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setSentence(p)}
              className="text-xs rounded-md border border-nexus-border px-2.5 py-1 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Enter a sentence to parse…"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={status === "running"}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            {status === "running" ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {status === "running" ? "Running…" : "Run Parsing"}
          </button>

          {status === "done" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-nexus-good">
              <CheckCircle2 size={14} /> Parsing Complete
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1.5 text-sm text-nexus-bad">
              <XCircle size={14} /> Parsing Failed
            </span>
          )}
        </div>
      </div>

      {status === "idle" && (
        <div className="rounded-2xl border border-dashed border-nexus-border bg-nexus-surface/50 p-8 text-center">
          <p className="text-sm font-medium text-nexus-text">Ready to parse</p>
          <p className="text-xs text-nexus-muted mt-1">
            Choose a sentence and click Run Parsing to visualize both approaches.
          </p>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}

      {unknownWords.length > 0 && (
        <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-4 py-3 text-sm text-nexus-warn">
          Unknown word(s) for this grammar: {unknownWords.join(", ")}. The grammar only knows a
          small fixed vocabulary — that's why parsing fails, honestly, rather than being silently
          patched.
        </div>
      )}

      {cykResult && topDownResult && (
        <>
          <div className="grid lg:grid-cols-2 gap-5">
            {/* LEFT — Bottom-Up */}
            <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowUp size={14} className="text-nexus-accent" /> Bottom-Up Approach (CYK)
                  </h2>
                  <p className="text-[11px] text-nexus-muted mt-0.5">
                    Starts from the tokens, combines them upward toward the start symbol.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBuPlaying((p) => !p)}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title={buPlaying ? "Pause" : "Play"}
                  >
                    {buPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setRevealedSpans((r) => Math.min(r + 1, maxSpan))}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title="Next step"
                  >
                    <SkipForward size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setRevealedSpans(1);
                      setBuPlaying(false);
                    }}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title="Reset"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <p className="text-xs text-nexus-muted">
                Rows build bottom-up: single words first, then longer spans. Each cell shows the
                nonterminals that could derive that span — hover a cell for the grammar rule used.
              </p>
              <CYKChart tokens={cykResult.tokens} table={cykResult.table} revealedSpans={revealedSpans} />
              <div className={`text-sm font-medium ${cykResult.accepted ? "text-nexus-good" : "text-nexus-bad"}`}>
                {revealedSpans >= maxSpan
                  ? cykResult.accepted
                    ? "✓ Accepted — S appears in the top cell."
                    : "✗ Rejected — S does not appear in the top cell."
                  : "Computing…"}
              </div>

              {cykResult.accepted && cykResult.tree && (
                <div>
                  <h3 className="text-xs font-semibold text-nexus-muted mb-2">Bottom-Up Parse Tree</h3>
                  <ParseTreeGraph
                    tree={cykResult.tree}
                    direction="bottom-up"
                    revealedCount={bottomUpTreeRevealedCount}
                    accent="accent"
                  />
                </div>
              )}
            </div>

            {/* RIGHT — Top-Down */}
            <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowDown size={14} className="text-nexus-purple" /> Top-Down Approach
                  </h2>
                  <p className="text-[11px] text-nexus-muted mt-0.5">
                    Starts from the start symbol, expands grammar rules toward the input sentence.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTdPlaying((p) => !p)}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title={tdPlaying ? "Pause" : "Play"}
                  >
                    {tdPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                  <button
                    onClick={() => setRevealedSteps((r) => Math.min(r + 1, maxSteps))}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title="Next step"
                  >
                    <SkipForward size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setRevealedSteps(1);
                      setTdPlaying(false);
                    }}
                    className="rounded-md border border-nexus-border p-1.5 hover:border-nexus-accentDim"
                    title="Reset"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              <TopDownDerivation
                startSymbol={topDownResult.start_symbol}
                steps={topDownResult.steps}
                revealedSteps={revealedSteps}
              />

              <div className={`text-sm font-medium ${topDownResult.accepted ? "text-nexus-good" : "text-nexus-bad"}`}>
                {revealedSteps >= maxSteps
                  ? topDownResult.accepted
                    ? "✓ Accepted — the derivation reached exactly the input tokens."
                    : "✗ Rejected — no derivation reaches this sentence."
                  : "Deriving…"}
              </div>

              {topDownResult.accepted && topDownResult.tree && (
                <div>
                  <h3 className="text-xs font-semibold text-nexus-muted mb-2">Top-Down Parse Tree</h3>
                  <ParseTreeGraph
                    tree={topDownResult.tree}
                    direction="top-down"
                    revealedCount={revealedSteps}
                    accent="purple"
                  />
                </div>
              )}
            </div>
          </div>

          {grammarSummary && (
            <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
              <h2 className="text-sm font-semibold mb-2">Grammar used (CNF) — shared by both approaches</h2>
              <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono text-nexus-muted">
                {Object.entries(grammarSummary).map(([lhs, options]) => (
                  <div key={lhs}>
                    <span className="text-nexus-data">{lhs}</span> {options.join(" | ")}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <h2 className="text-sm font-semibold mb-3">Top-Down vs Bottom-Up</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-nexus-muted border-b border-nexus-border">
                <th className="py-1.5 pr-4 font-medium">Top-Down</th>
                <th className="py-1.5 font-medium">Bottom-Up</th>
              </tr>
            </thead>
            <tbody className="text-nexus-text">
              <tr className="border-b border-nexus-border/50">
                <td className="py-1.5 pr-4">Starts with the start symbol</td>
                <td className="py-1.5">Starts with the input tokens</td>
              </tr>
              <tr className="border-b border-nexus-border/50">
                <td className="py-1.5 pr-4">Root → Leaves</td>
                <td className="py-1.5">Leaves → Root</td>
              </tr>
              <tr className="border-b border-nexus-border/50">
                <td className="py-1.5 pr-4">Expands grammar rules</td>
                <td className="py-1.5">Combines constituents</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4">Predictive / derivation-based</td>
                <td className="py-1.5">Data / input-driven</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <ReadInBookLink book="nlp" chapterId="syntax-and-parsing" label="Read the full Syntax & Parsing chapter in the NLP Book" />
        </div>
      </div>
    </div>
  );
}
