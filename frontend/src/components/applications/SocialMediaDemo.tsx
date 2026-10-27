import { useState } from "react";

import { analyzeSentiment, extractEntities, type NerEntity } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";
import { entityColor } from "./nerColors";

const SAMPLE_POSTS = [
  "Absolutely loved the new update! Everything feels so much faster now.",
  "App keeps crashing every time I open it on my phone, so frustrating.",
  "Not sure how I feel about this redesign yet, still getting used to it.",
  "Great customer support from the team at Google today, fixed my issue in minutes.",
];

interface PostResult {
  post: string;
  sentimentLabel: string;
  confidence: number;
  entities: NerEntity[];
}

const LABEL_COLOR: Record<string, string> = {
  Positive: "text-nexus-good",
  Negative: "text-nexus-bad",
  Neutral: "text-nexus-muted",
};

export default function SocialMediaDemo() {
  const [results, setResults] = useState<PostResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const analyzed = await Promise.all(
        SAMPLE_POSTS.map(async (post) => {
          const [sentiment, ner] = await Promise.all([analyzeSentiment(post), extractEntities(post)]);
          return { post, sentimentLabel: sentiment.label, confidence: sentiment.confidence, entities: ner.entities };
        })
      );
      setResults(analyzed);
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {SAMPLE_POSTS.map((p, i) => (
          <div key={i} className="rounded-lg border border-nexus-border bg-nexus-surface px-3 py-2 text-sm">
            "{p}"
          </div>
        ))}
      </div>
      <RunButton onClick={run} loading={loading} label="Analyze Posts" />
      {error && <ErrorBanner message={error} />}

      {results && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt p-3 space-y-1.5">
              <p className="text-sm italic">"{r.post}"</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium ${LABEL_COLOR[r.sentimentLabel] ?? ""}`}>{r.sentimentLabel}</span>
                <span className="text-[10px] text-nexus-muted">({Math.round(r.confidence * 100)}% confidence)</span>
                {r.entities.map((e, j) => (
                  <span key={j} className={`text-[10px] rounded-full px-1.5 py-0.5 border ${entityColor(e.label)}`}>
                    {e.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-nexus-muted/80 italic pt-1">
            Real sentiment + NER analysis on fixed example posts. Limitation: this lexicon-based sentiment approach
            cannot reliably detect sarcasm or context that depends on a longer conversation thread.
          </p>
        </div>
      )}
    </div>
  );
}
