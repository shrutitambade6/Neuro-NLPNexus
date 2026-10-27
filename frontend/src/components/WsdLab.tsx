import { useState } from "react";
import { Loader2 } from "lucide-react";

import { runWsd, type WsdResponse } from "../services/api";

const PRESETS = [
  { sentence: "The students went to the bank to deposit money.", word: "bank" },
  { sentence: "The fisherman sat quietly on the river bank.", word: "bank" },
  { sentence: "I need to book a table for dinner tonight.", word: "book" },
  { sentence: "The bat flew silently through the cave at night.", word: "bat" },
];

export default function WsdLab() {
  const [sentence, setSentence] = useState(PRESETS[0].sentence);
  const [word, setWord] = useState(PRESETS[0].word);
  const [result, setResult] = useState<WsdResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!sentence.trim() || !word.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await runWsd(sentence, word));
    } catch {
      setError("Couldn't reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-nexus-muted">
        This lab uses a real, simplified{" "}
        <a href="#" className="underline decoration-dotted">Lesk algorithm</a> — it
        picks the sense whose dictionary-style gloss shares the most words
        with the sentence's context. It only knows a small demo sense
        inventory (bank, book, bat) — anything else is reported honestly as
        unavailable, not guessed.
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setSentence(p.sentence);
              setWord(p.word);
            }}
            className="text-xs rounded-md border border-nexus-border px-2.5 py-1 text-nexus-muted hover:text-nexus-text"
          >
            {p.sentence.slice(0, 30)}…
          </button>
        ))}
      </div>
      <input
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        placeholder="Enter a sentence…"
      />
      <div className="flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="w-40 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
          placeholder="Target word"
        />
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Disambiguate
        </button>
      </div>
      {error && <p className="text-sm text-nexus-bad">{error}</p>}

      {result && !result.available && (
        <div className="rounded-lg border border-nexus-warn/40 bg-nexus-warn/10 px-4 py-3 text-sm text-nexus-warn">
          {result.message}
        </div>
      )}

      {result && result.available && (
        <div className="rounded-xl border border-nexus-border bg-nexus-surface p-4 space-y-3">
          <div className="text-xs text-nexus-muted">
            Context words: <span className="font-mono text-nexus-data">{result.context_words.join(", ")}</span>
          </div>
          <div className="space-y-2">
            {result.candidates.map((c) => (
              <div
                key={c.sense_id}
                className={`rounded-lg border p-3 text-sm ${
                  c.sense_id === result.predicted_sense
                    ? "border-nexus-good/50 bg-nexus-good/5"
                    : "border-nexus-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.sense_id.replace(/_/g, " ")}</span>
                  <span className="text-xs text-nexus-muted">overlap: {c.overlap_count}</span>
                </div>
                <p className="text-xs text-nexus-muted mt-1">{c.gloss}</p>
                {c.overlap_words.length > 0 && (
                  <p className="text-xs text-nexus-data mt-1 font-mono">
                    matched: {c.overlap_words.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
          {result.tie && (
            <p className="text-xs text-nexus-warn">
              Tie between senses — the algorithm can't confidently pick one, so
              no prediction is shown rather than guessing.
            </p>
          )}
          {!result.tie && result.predicted_sense && (
            <p className="text-sm text-nexus-good font-medium">
              Predicted sense: {result.predicted_sense.replace(/_/g, " ")}
            </p>
          )}
          {!result.tie && !result.predicted_sense && (
            <p className="text-sm text-nexus-muted">
              No gloss overlap found — the algorithm can't make a prediction from this context.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
