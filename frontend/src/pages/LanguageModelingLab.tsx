import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import {
  buildNgramTable,
  computePerplexity,
  computeSentenceProbability,
  type NgramTableResponse,
  type PerplexityResponse,
  type SentenceProbabilityResponse,
} from "../services/api";

// Local Card helper, same pattern as SemanticLab.tsx — kept local rather
// than imported so this page never touches Semantic Lab's file. The full
// TheoryBlocks that used to live here moved to the NLP Book's
// "Language Modeling" chapter.
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const DEFAULT_CORPUS = [
  "the student learns nlp",
  "the student learns fast",
  "the teacher teaches nlp",
  "the teacher explains nlp well",
];

function fmtProb(p: number): string {
  if (p === 0) return "0";
  if (p < 0.0001) return p.toExponential(2);
  return p.toFixed(4);
}

export default function LanguageModelingLab() {
  const [corpusText, setCorpusText] = useState(DEFAULT_CORPUS.join("\n"));
  const corpus = corpusText.split("\n").map((l) => l.trim()).filter(Boolean);

  // N-gram builder state
  const [builderN, setBuilderN] = useState(2);
  const [table, setTable] = useState<NgramTableResponse | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  const runBuilder = async () => {
    if (corpus.length === 0) return;
    setTableLoading(true);
    setTableError(null);
    try {
      setTable(await buildNgramTable(corpus, builderN));
    } catch {
      setTableError("Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
    } finally {
      setTableLoading(false);
    }
  };

  // Sentence probability state
  const [sentence, setSentence] = useState("the student learns nlp");
  const [probN, setProbN] = useState(2);
  const [smoothing, setSmoothing] = useState<"none" | "laplace">("none");
  const [probResult, setProbResult] = useState<SentenceProbabilityResponse | null>(null);
  const [probLoading, setProbLoading] = useState(false);
  const [probError, setProbError] = useState<string | null>(null);

  const runSentenceProbability = async () => {
    if (!sentence.trim() || corpus.length === 0) return;
    setProbLoading(true);
    setProbError(null);
    try {
      setProbResult(await computeSentenceProbability(corpus, sentence, probN, smoothing));
    } catch {
      setProbError("Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
    } finally {
      setProbLoading(false);
    }
  };

  // Standalone perplexity calculator state
  const [ppProbability, setPpProbability] = useState("0.01");
  const [ppWords, setPpWords] = useState("4");
  const [ppResult, setPpResult] = useState<PerplexityResponse | null>(null);
  const [ppError, setPpError] = useState<string | null>(null);

  const runPerplexity = async () => {
    const p = Number(ppProbability);
    const n = Number(ppWords);
    if (!(p > 0 && p <= 1) || !(n > 0)) {
      setPpError("Probability must be in (0, 1] and word count must be a positive integer.");
      setPpResult(null);
      return;
    }
    setPpError(null);
    try {
      setPpResult(await computePerplexity(p, n));
    } catch {
      setPpError("Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Language Modeling Lab — N-grams</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Real n-gram counting and conditional-probability calculation
          against your own corpus — every number below is computed by the
          backend from the sentences you enter, not looked up from a table.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="language-modeling" label="Language Modeling" />

      <Card title="What an n-gram language model does">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Assigns a probability to a sentence by chaining conditional
          probabilities of each word given the previous n−1 words.
        </p>
        <ReadInBookLink book="nlp" chapterId="language-modeling" />
      </Card>

      <Card title="Your corpus">
        <p className="text-xs text-nexus-muted">One sentence per line. Every calculator below is built from these sentences.</p>
        <textarea
          value={corpusText}
          onChange={(e) => setCorpusText(e.target.value)}
          rows={5}
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
        <p className="text-xs text-nexus-muted">{corpus.length} sentence(s) loaded.</p>
      </Card>

      <Card title="N-gram builder">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Unigram = single words, bigram = pairs, trigram = triples — just
          n-grams with different context sizes.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-sm">Order (n):</label>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setBuilderN(n)}
              className={`rounded-md border px-3 py-1 text-xs font-medium ${
                builderN === n
                  ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                  : "border-nexus-border text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {n === 1 ? "Unigram" : n === 2 ? "Bigram" : "Trigram"}
            </button>
          ))}
          <button
            onClick={runBuilder}
            disabled={tableLoading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            {tableLoading && <Loader2 size={14} className="animate-spin" />}
            Build n-grams
          </button>
        </div>

        {tableError && (
          <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
            <AlertCircle size={16} /> {tableError}
          </div>
        )}

        {table && (
          <div className="space-y-2">
            <p className="text-xs text-nexus-muted">
              Vocabulary size: {table.vocab_size} · Total tokens: {table.total_tokens} · Distinct{" "}
              {table.n}-grams: {table.distinct_ngrams}
              {table.truncated && " (showing top 30 by count)"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-nexus-muted text-left border-b border-nexus-border">
                    <th className="py-2 pr-4">n-gram</th>
                    <th className="py-2 pr-4">Context</th>
                    <th className="py-2 pr-4">Count</th>
                    <th className="py-2 pr-4">Context count</th>
                    <th className="py-2 pr-4">P (unsmoothed)</th>
                    <th className="py-2">P (Laplace)</th>
                  </tr>
                </thead>
                <tbody className="text-nexus-muted">
                  {table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-nexus-border/50">
                      <td className="py-1.5 pr-4 font-mono text-nexus-text">{row.ngram}</td>
                      <td className="py-1.5 pr-4 font-mono">{row.context ?? "(whole corpus)"}</td>
                      <td className="py-1.5 pr-4">{row.count}</td>
                      <td className="py-1.5 pr-4">{row.context_count}</td>
                      <td className="py-1.5 pr-4 font-mono">{fmtProb(row.probability_unsmoothed)}</td>
                      <td className="py-1.5 font-mono">{fmtProb(row.probability_laplace)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card title="Sentence probability">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Multiplies together how likely each word was, given the words just
          before it — including a final end-of-sentence step.
        </p>
        <ReadInBookLink book="nlp" chapterId="language-modeling" label="Read the full probability & perplexity derivation" />
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            placeholder="Enter a sentence…"
          />
          <select
            value={probN}
            onChange={(e) => setProbN(Number(e.target.value))}
            className="rounded-lg bg-nexus-bg border border-nexus-border px-2 py-2 text-sm"
          >
            <option value={1}>Unigram</option>
            <option value={2}>Bigram</option>
            <option value={3}>Trigram</option>
          </select>
          <select
            value={smoothing}
            onChange={(e) => setSmoothing(e.target.value as "none" | "laplace")}
            className="rounded-lg bg-nexus-bg border border-nexus-border px-2 py-2 text-sm"
          >
            <option value="none">No smoothing</option>
            <option value="laplace">Laplace (add-1)</option>
          </select>
          <button
            onClick={runSentenceProbability}
            disabled={probLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50"
          >
            {probLoading && <Loader2 size={14} className="animate-spin" />}
            Calculate
          </button>
        </div>

        {probError && (
          <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
            <AlertCircle size={16} /> {probError}
          </div>
        )}

        {probResult && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-nexus-muted text-left border-b border-nexus-border">
                    <th className="py-2 pr-4">Step</th>
                    <th className="py-2 pr-4">P(target | context)</th>
                    <th className="py-2 pr-4">count / context count</th>
                    <th className="py-2">Probability</th>
                  </tr>
                </thead>
                <tbody className="text-nexus-muted">
                  {probResult.steps.map((step, i) => (
                    <tr key={i} className="border-b border-nexus-border/50">
                      <td className="py-1.5 pr-4 font-mono text-nexus-text">{i + 1}</td>
                      <td className="py-1.5 pr-4 font-mono">
                        P({step.target} | {step.context})
                        {step.out_of_vocabulary && (
                          <span className="ml-1.5 text-[10px] text-nexus-warn">unseen word</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-4 font-mono">
                        {step.count_ngram} / {step.context_count}
                      </td>
                      <td className="py-1.5 font-mono">{fmtProb(step.probability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {probResult.zero_probability ? (
              <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-4 py-3 text-sm text-nexus-warn">
                P(sentence) = 0 — this exact {probResult.n}-gram sequence was never seen in the corpus, and
                with no smoothing there's no probability mass reserved for unseen sequences. Try Laplace
                smoothing to see the difference.
              </div>
            ) : (
              <div className="rounded-lg border border-nexus-good/40 bg-nexus-good/10 px-4 py-3 text-sm text-nexus-good space-y-1">
                <p>P(sentence) ≈ {probResult.total_probability.toExponential(4)}</p>
                <p>log P(sentence) = {probResult.log_probability?.toFixed(4)}</p>
                <p>Perplexity = {probResult.perplexity?.toFixed(3)}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Perplexity calculator">
        <p className="text-sm text-nexus-muted leading-relaxed">
          How "surprised" the model is by a sentence, on average per word —
          lower is better.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-nexus-muted flex flex-col gap-1">
            Probability
            <input
              value={ppProbability}
              onChange={(e) => setPpProbability(e.target.value)}
              className="w-28 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="text-xs text-nexus-muted flex flex-col gap-1">
            Number of words
            <input
              value={ppWords}
              onChange={(e) => setPpWords(e.target.value)}
              className="w-28 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono"
            />
          </label>
          <button
            onClick={runPerplexity}
            className="rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90"
          >
            Calculate
          </button>
        </div>
        {ppError && <p className="text-sm text-nexus-bad">{ppError}</p>}
        {ppResult && (
          <div className="rounded-lg border border-nexus-good/40 bg-nexus-good/10 px-4 py-3 text-sm text-nexus-good">
            PP = ({ppResult.probability})^(-1/{ppResult.n_words}) = {ppResult.perplexity.toFixed(4)}
          </div>
        )}
      </Card>
    </div>
  );
}
