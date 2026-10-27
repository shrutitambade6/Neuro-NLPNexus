import { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, XCircle } from "lucide-react";

import LessonCompleteButton from "../components/LessonCompleteButton";
import ReadInBookLink from "../components/ReadInBookLink";
import { resolvePronoun, type ResolvePronounResponse } from "../services/api";

// Local Card helper mirrors the pattern already used in SemanticLab.tsx.
// Kept local (not imported) so this lab never touches those files' code.
// The full TheoryBlock that used to live here moved to the NLP Book's
// "Discourse & Anaphora Resolution" chapter.
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const EXAMPLE_SENTENCES: { sentence: string; pronoun: string }[] = [
  { sentence: "John gave Ravi the book because he needed it.", pronoun: "he" },
  { sentence: "John gave Ravi the book because he needed it.", pronoun: "it" },
  { sentence: "Riya bought a laptop because she needed it for college.", pronoun: "she" },
  { sentence: "The students finished the exam because they studied hard.", pronoun: "they" },
];

export default function DiscourseLab() {
  const [sentence, setSentence] = useState(EXAMPLE_SENTENCES[0].sentence);
  const [pronoun, setPronoun] = useState(EXAMPLE_SENTENCES[0].pronoun);
  const [result, setResult] = useState<ResolvePronounResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (s: string = sentence, p: string = pronoun) => {
    if (!s.trim() || !p.trim()) {
      setError("Enter a sentence and a pronoun.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await resolvePronoun(s, p));
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Couldn't reach the backend — start it with `uvicorn app.main:app --reload`.");
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (ex: { sentence: string; pronoun: string }) => {
    setSentence(ex.sentence);
    setPronoun(ex.pronoun);
    setResult(null);
    setError(null);
    run(ex.sentence, ex.pronoun);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Discourse Lab — Pronoun Resolution</h1>
        <p className="text-nexus-muted text-sm mt-1">
          Given a sentence and a pronoun, find which earlier noun phrase it most likely refers to —
          the core problem behind anaphora resolution and coreference.
        </p>
      </div>

      <LessonCompleteButton domain="nlp" moduleId="discourse" label="Discourse Lab" />

      <div className="flex items-start gap-2 rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-4 py-3 text-xs text-nexus-warn">
        <AlertCircle size={16} className="shrink-0 mt-0.5" />
        <span>
          <strong>Honesty note:</strong> a real Hobbs (1978) algorithm walks a genuine syntactic
          parse tree. This codebase's only real parser (the CYK Parsing Lab) only handles one
          fixed toy grammar, and cannot parse sentences like the ones here. So this lab does
          something real but simpler instead: rule-based noun-phrase chunking (no real POS
          tagger — nltk/spacy aren't installed) plus Hobbs-style nearest-first candidate ranking
          with gender/number/person agreement constraints. Every candidate and every accept/reject
          reason below is genuinely computed from the sentence you enter — it's the{" "}
          <em>algorithm</em> that's simplified, not the computation. It will get some sentences
          wrong; that's an honest limitation of not having a real parser or POS tagger, not a bug
          being hidden from you.
        </span>
      </div>

      <Card title="What pronoun resolution actually does">
        <p className="text-sm text-nexus-muted leading-relaxed">
          Given a pronoun, determine which earlier-mentioned entity (its
          antecedent) it refers to — agreement filters candidates, then
          proximity ranks them.
        </p>
        <ReadInBookLink book="nlp" chapterId="discourse-and-anaphora" />
      </Card>

      <Card title="Try it">
        <p className="text-xs text-nexus-muted">
          Enter a sentence and the pronoun to resolve, or load one of the worked examples below.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_SENTENCES.map((ex, i) => (
            <button
              key={i}
              onClick={() => loadExample(ex)}
              className="rounded-lg border border-nexus-border px-3 py-1.5 text-xs text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
            >
              "{ex.sentence}" — <span className="font-mono text-nexus-accent">{ex.pronoun}</span>
            </button>
          ))}
        </div>

        <textarea
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          rows={2}
          className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Enter a sentence…"
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-nexus-text font-medium" htmlFor="pronoun-input">
            Pronoun to resolve:
          </label>
          <input
            id="pronoun-input"
            value={pronoun}
            onChange={(e) => setPronoun(e.target.value)}
            className="w-28 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
            placeholder="he / it / they…"
          />
          <button
            onClick={() => run()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90 disabled:opacity-50 ml-auto"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Resolve
          </button>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-bad/40 bg-nexus-bad/10 px-4 py-3 text-sm text-nexus-bad">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {result && !result.available && (
        <div className="flex items-center gap-2 rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-4 py-3 text-sm text-nexus-warn">
          <AlertCircle size={16} className="shrink-0" /> {result.message}
        </div>
      )}

      {result && result.available && (
        <>
          <Card title="Resolution">
            {result.resolved_antecedent ? (
              <p className="flex items-center gap-2 text-sm">
                <span className="font-mono text-nexus-accent">"{result.pronoun}"</span>
                <ArrowRight size={16} className="text-nexus-muted" />
                <span className="font-mono text-nexus-good">"{result.resolved_antecedent}"</span>
              </p>
            ) : (
              <p className="text-sm text-nexus-muted">
                No candidate noun phrase agreed in gender/number/person with{" "}
                <span className="font-mono">"{result.pronoun}"</span> — an honest "no resolution
                found" rather than a forced guess.
              </p>
            )}
          </Card>

          <Card title="Candidates, nearest first">
            <p className="text-xs text-nexus-muted">
              Every noun phrase found before the pronoun, ranked by proximity (Hobbs-style), with
              the real agreement check that accepted or rejected it.
            </p>
            <div className="space-y-2">
              {result.candidates.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${
                    c.agrees_with_pronoun
                      ? "border-nexus-good/40 bg-nexus-good/10"
                      : "border-nexus-border bg-nexus-bg"
                  }`}
                >
                  {c.agrees_with_pronoun ? (
                    <CheckCircle2 size={14} className="text-nexus-good shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={14} className="text-nexus-muted shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-mono text-nexus-text">
                      "{c.text}"{" "}
                      <span className="text-nexus-muted">
                        ({c.is_proper_noun ? "proper noun" : "common noun"}, {c.gender}, {c.number},
                        distance {c.word_distance})
                      </span>
                    </p>
                    <p className="text-nexus-muted">{c.reason}</p>
                  </div>
                </div>
              ))}
              {result.candidates.length === 0 && (
                <p className="text-nexus-muted text-xs">No noun phrases were found before the pronoun.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
