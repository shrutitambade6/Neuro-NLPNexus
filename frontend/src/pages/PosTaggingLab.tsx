import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, Play, Sparkles } from "lucide-react";

import MatrixGrid from "../components/dl/MatrixGrid";
import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import TagBadge from "../components/nlp/TagBadge";
import ViterbiTrellis from "../components/nlp/ViterbiTrellis";
import { tagPOS, type POSTaggingResponse } from "../services/api";
import { FAMILY_CLASSES, FAMILY_LABEL, familyOf, type PosFamily } from "../utils/posTags";

const EXAMPLE_SENTENCES = [
  "The dog runs quickly.",
  "She reads a new book.",
  "John and Mary watch the movie.",
  "The quick fox jumps over the lazy dog.",
];

const STEP_DELAY_MS = 700;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-nexus-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const PIPELINE_STAGES = [
  "Tokens",
  "POS Tags",
  "HMM",
  "Transition Matrix",
  "Emission Matrix",
  "Initial Probability",
  "Viterbi Algorithm",
  "Tagged Sentence",
];

function PipelineBanner({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PIPELINE_STAGES.map((stage, i) => (
        <div key={stage} className="flex items-center gap-1.5">
          <motion.span
            animate={{
              opacity: i <= activeIndex ? 1 : 0.35,
              scale: i === activeIndex ? 1.05 : 1,
            }}
            transition={{ duration: 0.3 }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
              i <= activeIndex
                ? "border-nexus-accent/60 bg-nexus-accent/15 text-nexus-accent"
                : "border-nexus-border text-nexus-muted"
            }`}
          >
            {stage}
          </motion.span>
          {i < PIPELINE_STAGES.length - 1 && <ArrowRight size={12} className="text-nexus-faint shrink-0" />}
        </div>
      ))}
    </div>
  );
}

function FamilyLegend() {
  const families: PosFamily[] = ["nominal", "predicate", "function", "punct"];
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-nexus-muted">
      {families.map((f) => (
        <div key={f} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${FAMILY_CLASSES[f].bg}`} />
          {FAMILY_LABEL[f]}
        </div>
      ))}
    </div>
  );
}

function InitialProbabilityRow({ probs, tagSet }: { probs: Record<string, number>; tagSet: string[] }) {
  const max = Math.max(...Object.values(probs));
  return (
    <div className="space-y-1.5">
      {tagSet.map((tag) => {
        const p = probs[tag] ?? 0;
        const family = familyOf(tag);
        return (
          <div key={tag} className="flex items-center gap-2">
            <TagBadge tag={tag} size="sm" />
            <div className="flex-1 h-3 rounded-full bg-nexus-bg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(p / max) * 100}%` }}
                transition={{ duration: 0.6 }}
                className={`h-full ${FAMILY_CLASSES[family].bg}`}
              />
            </div>
            <span className="w-14 text-right text-[11px] font-mono text-nexus-muted">{p.toFixed(4)}</span>
          </div>
        );
      })}
    </div>
  );
}

// A small, local-only self-check — no backend or global quiz system exists
// in this app, so this stays scoped to this lab rather than inventing
// app-wide quiz infrastructure just for one page.
const QUIZ_QUESTIONS = [
  {
    q: "In an HMM POS tagger, the transition matrix stores the probability of...",
    options: ["a word given a tag", "a tag given the previous tag", "a tag given the word after it"],
    correct: 1,
  },
  {
    q: "Why does Viterbi use dynamic programming instead of trying every possible tag sequence?",
    options: [
      "It's required by grammar rules",
      "It keeps only the single best path into each cell, avoiding exponential blow-up",
      "It only works on short sentences",
    ],
    correct: 1,
  },
  {
    q: "The emission matrix stores the probability of...",
    options: ["a tag given the previous tag", "a word given its tag", "a sentence given its length"],
    correct: 1,
  },
];

function QuickCheck() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);

  const score = QUIZ_QUESTIONS.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
  const allAnswered = Object.keys(answers).length === QUIZ_QUESTIONS.length;

  return (
    <div className="space-y-4">
      {QUIZ_QUESTIONS.map((q, qi) => (
        <div key={qi} className="space-y-1.5">
          <p className="text-sm text-nexus-text">{qi + 1}. {q.q}</p>
          <div className="flex flex-col gap-1.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = revealed && oi === q.correct;
              const isWrongSelected = revealed && selected && oi !== q.correct;
              return (
                <button
                  key={oi}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className={`text-left text-xs rounded-lg border px-3 py-1.5 transition-colors ${
                    isCorrect
                      ? "border-nexus-good/60 bg-nexus-good/10 text-nexus-good"
                      : isWrongSelected
                        ? "border-nexus-bad/60 bg-nexus-bad/10 text-nexus-bad"
                        : selected
                          ? "border-nexus-accent/60 bg-nexus-accent/10 text-nexus-accent"
                          : "border-nexus-border text-nexus-muted hover:border-nexus-accent/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRevealed(true)}
          disabled={!allAnswered}
          className="rounded-lg bg-nexus-accent px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40"
        >
          Check answers
        </button>
        {revealed && (
          <span className="text-xs text-nexus-muted">
            {score} / {QUIZ_QUESTIONS.length} correct
          </span>
        )}
      </div>
    </div>
  );
}

export default function PosTaggingLab() {
  const [sentence, setSentence] = useState(EXAMPLE_SENTENCES[0]);
  const [result, setResult] = useState<POSTaggingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0); // 0=tokens,1=initial,2=transition,3=emission,4=trellis+tagged
  const reduceMotion = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = async () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLoading(true);
    setError(null);
    setResult(null);
    setStage(0);
    try {
      const r = await tagPOS(sentence);
      setResult(r);
      const delay = reduceMotion ? 0 : STEP_DELAY_MS;
      [1, 2, 3, 4].forEach((s) => {
        const t = setTimeout(() => setStage(s), s * delay);
        timers.current.push(t);
      });
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const pipelineIndex = !result
    ? -1
    : stage === 0
      ? 1
      : stage === 1
        ? 5
        : stage === 2
          ? 3
          : stage === 3
            ? 4
            : 7;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles size={22} className="text-nexus-gold" />
          POS Tagging Lab
        </h1>
        <p className="text-nexus-muted text-sm mt-1">
          A real Hidden Markov Model, trained from a small hand-tagged corpus (
          {result?.corpus_size ?? 45} sentences), decoded with the real Viterbi
          dynamic-programming algorithm — every matrix and score below is genuinely
          computed for the sentence you enter, not illustrative.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="pos-tagging" label="POS Tagging Lab" />

      <Section title="What is POS tagging?">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Assigning a grammatical category — noun, verb, adjective — to every
          word in a sentence.
        </p>
        <ReadInBookLink book="nlp" chapterId="pos-tagging" />
      </Section>

      <Section
        title="The pipeline"
        subtitle="Tokens → POS Tags → Hidden Markov Model → Transition Matrix → Emission Matrix → Initial Probability → Viterbi → Tagged sentence"
      >
        <PipelineBanner activeIndex={pipelineIndex} />
      </Section>

      <Section title="Try your own sentence">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && run()}
            placeholder="Type a sentence to tag..."
            className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          />
          <button
            onClick={run}
            disabled={loading || !sentence.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Tag this sentence
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {EXAMPLE_SENTENCES.map((ex) => (
            <button
              key={ex}
              onClick={() => setSentence(ex)}
              className="text-[11px] rounded-full border border-nexus-border px-2.5 py-1 text-nexus-muted hover:border-nexus-accent/50 hover:text-nexus-text"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-nexus-bad">{error}</p>}
      </Section>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Section title="1. Tokens" subtitle="The sentence split into individual words and punctuation.">
              <div className="flex flex-wrap gap-2">
                {result.tokens.map((tok, i) => (
                  <motion.span
                    key={i}
                    initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06 }}
                    className="rounded-lg border border-nexus-border bg-nexus-bg px-2.5 py-1 text-sm font-mono"
                  >
                    {tok}
                  </motion.span>
                ))}
              </div>
              {result.unknown_tokens.length > 0 && (
                <p className="text-[11px] text-nexus-muted">
                  Not seen in the training corpus (tagged via a shape/suffix heuristic instead):{" "}
                  <span className="font-mono text-nexus-warn">{result.unknown_tokens.join(", ")}</span>
                </p>
              )}
            </Section>

            {stage >= 1 && (
              <Section
                title="2. Initial probability"
                subtitle="P(tag | start of sentence) — how likely each tag is to start a sentence, counted from the training corpus."
              >
                <InitialProbabilityRow probs={result.initial_probabilities} tagSet={result.tag_set} />
              </Section>
            )}

            {stage >= 2 && (
              <Section
                title="3. Transition matrix"
                subtitle="P(tag_j | tag_i) — the real probability of each tag following each other tag, counted from the corpus with add-one smoothing. Every row sums to 1."
              >
                <FamilyLegend />
                <div className="flex gap-2 overflow-x-auto pt-1">
                  <div className="flex flex-col gap-0.5 justify-around shrink-0 pt-9">
                    {result.tag_set.map((tag) => (
                      <div key={tag} className="h-9 flex items-center">
                        <TagBadge tag={tag} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5 mb-1 pl-1">
                      {result.tag_set.map((tag) => (
                        <div key={tag} className="w-9 flex justify-center">
                          <TagBadge tag={tag} size="sm" />
                        </div>
                      ))}
                    </div>
                    <MatrixGrid matrix={result.transition_matrix} cellSize={36} decimals={2} />
                  </div>
                </div>
                <p className="text-[11px] text-nexus-muted">
                  Row = the tag before, column = the tag after. Darker cells mean a more likely
                  transition — e.g. DET → NOUN ("the dog") is far more likely than DET → VERB
                  ("the runs").
                </p>
              </Section>
            )}

            {stage >= 3 && (
              <Section
                title="4. Emission probabilities for this sentence"
                subtitle="P(word | tag) for each word actually in your sentence — how likely each of your words is under each tag."
              >
                <div className="flex gap-2 overflow-x-auto">
                  <div className="flex flex-col gap-0.5 justify-around shrink-0 pt-6">
                    {result.token_emissions.map((te, i) => (
                      <div key={i} className="h-8 flex items-center gap-1 text-xs font-mono pr-1">
                        {te.token}
                        {!te.is_known && <span className="text-nexus-warn text-[9px]">*</span>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {result.tag_set.map((tag) => (
                        <div key={tag} className="w-8 flex justify-center">
                          <TagBadge tag={tag} size="sm" />
                        </div>
                      ))}
                    </div>
                    <MatrixGrid
                      matrix={result.token_emissions.map((te) => result.tag_set.map((tag) => te.probabilities[tag]))}
                      cellSize={32}
                      decimals={2}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-nexus-muted">
                  * = not seen in training, tagged via a shape/suffix heuristic (capitalization →
                  likely PROPN, "-ly" → likely ADV, and so on) instead of counted probabilities.
                </p>
              </Section>
            )}

            {stage >= 4 && (
              <>
                <Section
                  title="5. Viterbi trellis"
                  subtitle="Each cell is the real log-probability of the best tag sequence ending in that tag at that word. The gold line traces the actual highest-probability path the algorithm found — the same path it backtraces to produce the final tags below."
                >
                  <p className="text-xs text-nexus-muted">
                    Formula: <span className="font-mono">V<sub>t</sub>(j) = max<sub>i</sub> [ V<sub>t−1</sub>(i) · a<sub>ij</sub> ] · b<sub>j</sub>(word<sub>t</sub>)</span>{" "}
                    — computed here in log-space (adding instead of multiplying) so scores don't
                    underflow to zero on longer sentences. A higher (less negative) score is more
                    likely.
                  </p>
                  <ViterbiTrellis
                    trellis={result.trellis}
                    tagSet={result.tag_set}
                    tokens={result.tokens}
                    bestPath={result.best_path}
                  />
                  <p className="text-[11px] text-nexus-muted">
                    Best path total log-probability: <span className="font-mono text-nexus-text">{result.best_path_score}</span>
                  </p>
                </Section>

                <Section title="6. Final tagged sentence">
                  <div className="flex flex-wrap gap-3">
                    {result.tagged.map((t, i) => (
                      <motion.div
                        key={i}
                        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: reduceMotion ? 0 : i * 0.1, type: "spring", stiffness: 300, damping: 22 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <span className="text-sm font-mono text-nexus-text">{t.token}</span>
                        <TagBadge tag={t.tag} />
                      </motion.div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Section title="Quick check" subtitle="A few questions to check the ideas above stuck.">
        <QuickCheck />
      </Section>
    </div>
  );
}
