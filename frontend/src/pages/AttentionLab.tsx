import { useRef, useState } from "react";
import { Loader2, Play, Shuffle } from "lucide-react";

import ConceptTooltip from "../components/ConceptTooltip";
import MatrixGrid from "../components/dl/MatrixGrid";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import NexiMascot from "../components/nexi/NexiMascot";
import {
  generateRandomProjection,
  runAttentionForward,
  type AttentionForwardResponse,
  type ProjectionWeightsIO,
} from "../services/api";

const DIM = 3;
const STEP_DELAY_MS = 750;
const DEFAULT_TOKENS = ["the", "cat", "sat"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function randomEmbeddings(n: number, dim: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: dim }, () => Math.round((Math.random() * 2 - 1) * 100) / 100));
}

export default function AttentionLab() {
  const [tokens, setTokens] = useState<string[]>(DEFAULT_TOKENS);
  const [embeddings, setEmbeddings] = useState<number[][]>(() => randomEmbeddings(DEFAULT_TOKENS.length, DIM));
  const [dK, setDK] = useState(2);
  const [dV, setDV] = useState(2);
  const [weights, setWeights] = useState<ProjectionWeightsIO | null>(null);
  const [result, setResult] = useState<AttentionForwardResponse | null>(null);
  const [stage, setStage] = useState(0); // 0=none,1=raw,2=scaled,3=softmax,4=output
  const [genLoading, setGenLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const reset = () => {
    setWeights(null);
    setResult(null);
    setStage(0);
  };

  const addToken = () => {
    if (tokens.length >= 6) return;
    setTokens((t) => [...t, `tok${t.length + 1}`]);
    setEmbeddings((e) => [...e, Array.from({ length: DIM }, () => 0)]);
    reset();
  };
  const removeToken = () => {
    if (tokens.length <= 2) return;
    setTokens((t) => t.slice(0, -1));
    setEmbeddings((e) => e.slice(0, -1));
    reset();
  };

  const randomize = async () => {
    setGenLoading(true);
    setError(null);
    try {
      setWeights(await generateRandomProjection(DIM, dK, dV));
      setResult(null);
      setStage(0);
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setGenLoading(false);
    }
  };

  const run = async () => {
    if (!weights) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunLoading(true);
    setError(null);
    setResult(null);
    setStage(0);
    try {
      const r = await runAttentionForward(embeddings, weights);
      setResult(r);
      [1, 2, 3, 4].forEach((s) => {
        const t = setTimeout(() => setStage(s), s * STEP_DELAY_MS);
        timers.current.push(t);
      });
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setRunLoading(false);
    }
  };

  const animating = stage > 0 && stage < 4;

  // NEXI "points toward the relevant context" (spec #20) using the real
  // attention-weight matrix, not a scripted example sentence — this lab is
  // an editable playground, so whichever pair actually has the highest
  // off-diagonal weight (excluding a token attending to itself, which is
  // common and less illustrative) is what NEXI calls out.
  let strongestPair: { from: string; to: string; weight: number } | null = null;
  if (result && stage >= 3) {
    let best = -1;
    let bi = -1;
    let bj = -1;
    result.attention_weights.forEach((row, i) => {
      row.forEach((w, j) => {
        if (i !== j && w > best) {
          best = w;
          bi = i;
          bj = j;
        }
      });
    });
    if (bi >= 0) strongestPair = { from: tokens[bi], to: tokens[bj], weight: best };
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Attention &amp; Transformers Lab</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Real scaled dot-product <ConceptTooltip term="attentionMechanism">attention</ConceptTooltip>: softmax(QK<sup>T</sup> / √d<sub>k</sub>)V, computed
          exactly over the token embeddings below. Q, K, and V are real linear projections of
          those embeddings (not the embeddings themselves), and every row of the attention-weight
          matrix is a genuine probability distribution — how much each token attends to every
          token, including itself. This is one real attention head over a hand-sized sequence;
          a full <ConceptTooltip term="transformer">transformer</ConceptTooltip> stacks several heads and adds positional encoding, which this lab
          doesn't invent numbers for just to look more complete.
        </p>
      </div>

      <LessonCompleteButton domain="dl" moduleId="attention-transformers" label="Attention & Transformers" />
      <ReadInBookLink book="dl" chapterId="attention-and-transformers" label="Read the Attention & Transformers chapter in the DL Book" />

      <Section title="1. Token embeddings">
        <p className="text-xs text-nexus-muted">
          Each token is a real {DIM}-dimensional vector. Edit the labels or the numbers, or
          generate a fresh random set.
        </p>
        <div className="space-y-1.5">
          {tokens.map((tok, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={tok}
                onChange={(e) => setTokens((t) => t.map((v, idx) => (idx === i ? e.target.value : v)))}
                className="w-20 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs"
              />
              <MatrixGrid
                matrix={[embeddings[i]]}
                cellSize={40}
                editable
                onCellChange={(_r, c, v) =>
                  setEmbeddings((e) => e.map((row, ri) => (ri === i ? row.map((cell, ci) => (ci === c ? v : cell)) : row)))
                }
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={addToken} disabled={tokens.length >= 6} className="text-xs text-nexus-accent hover:underline disabled:opacity-40">
            + Add token
          </button>
          <button onClick={removeToken} disabled={tokens.length <= 2} className="text-xs text-nexus-bad hover:underline disabled:opacity-40">
            − Remove token
          </button>
          <button
            onClick={() => {
              setEmbeddings(randomEmbeddings(tokens.length, DIM));
              reset();
            }}
            className="inline-flex items-center gap-1 text-xs text-nexus-muted hover:text-nexus-text"
          >
            <Shuffle size={12} /> Randomize embeddings
          </button>
        </div>
      </Section>

      <Section title="2. Q/K/V projections">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-xs text-nexus-muted">
            d<sub>k</sub> (query/key dim):{" "}
            <select value={dK} onChange={(e) => { setDK(Number(e.target.value)); reset(); }} className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs">
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="text-xs text-nexus-muted">
            d<sub>v</sub> (value dim):{" "}
            <select value={dV} onChange={(e) => { setDV(Number(e.target.value)); reset(); }} className="ml-1 rounded-lg bg-nexus-bg border border-nexus-border px-2 py-1 text-xs">
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <button
          onClick={randomize}
          disabled={genLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {genLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
          {weights ? "Re-randomize projections" : "Randomize projections"}
        </button>
      </Section>

      {weights && (
        <Section title="3. Run attention">
          <button
            onClick={run}
            disabled={runLoading || animating}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-good/90 hover:bg-nexus-good px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run attention
          </button>
          {error && <p className="text-sm text-nexus-bad">{error}</p>}

          {result && (
            <div className="space-y-4 pt-2">
              {stage >= 1 && (
                <div>
                  <p className="text-xs text-nexus-muted mb-1">Raw scores (Q·K<sup>T</sup>)</p>
                  <MatrixGrid matrix={stage >= 2 ? result.scaled_scores : result.raw_scores} cellSize={44} />
                </div>
              )}
              {stage >= 3 && (
                <div>
                  <p className="text-xs text-nexus-muted mb-1">
                    Attention weights (real softmax over each row — rows sum to 1)
                  </p>
                  <div className="flex gap-1 mb-1">
                    <span className="w-0" />
                    {tokens.map((t) => <span key={t} className="w-[44px] text-center text-[10px] text-nexus-muted">{t}</span>)}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-0.5 justify-around">
                      {tokens.map((t) => <span key={t} className="text-[10px] text-nexus-muted h-[44px] flex items-center">{t}</span>)}
                    </div>
                    <MatrixGrid matrix={result.attention_weights} cellSize={44} decimals={2} />
                  </div>
                  {strongestPair && (
                    <div className="flex items-center gap-2 mt-3 rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2">
                      <NexiMascot mood="idea" size="sm" />
                      <p className="text-xs text-nexus-muted">
                        <span className="font-mono text-nexus-text">"{strongestPair.from}"</span> attends most
                        strongly to <span className="font-mono text-nexus-text">"{strongestPair.to}"</span> —{" "}
                        {(strongestPair.weight * 100).toFixed(0)}% of its attention weight, straight from the
                        real matrix above.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {stage >= 4 && (
                <div>
                  <p className="text-xs text-nexus-muted mb-1">
                    Output (attention_weights @ V) — each row is that token's new, context-aware representation
                  </p>
                  <MatrixGrid matrix={result.output} cellSize={44} />
                </div>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
