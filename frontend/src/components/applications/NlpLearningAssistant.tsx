import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, Loader2, Send } from "lucide-react";

import { askAssistant, type AssistantBlock, type AssistantContext, type AssistantRelatedLab } from "../../services/api";
import { AssistantBlockList } from "./AssistantBlocks";
import { BACKEND_ERROR, ErrorBanner } from "./AppShared";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface Turn {
  role: "user" | "assistant";
  text?: string;
  blocks?: AssistantBlock[];
  relatedLab?: AssistantRelatedLab | null;
  suggestedActions?: string[];
}

const ACTION_MESSAGES: Record<string, string> = {
  "Give Example": "Give me an example.",
  "Show Code": "Show me the code.",
  "Challenge Me": "Give me a challenge.",
  "Explain Simply": "Explain it simply.",
};

const DEFAULT_SUGGESTIONS = [
  "Give me an example of tokenization",
  "Explain CYK parsing",
  "Give me a numerical on perplexity",
  "Compare stemming and lemmatization",
  "How is NLP used in banking?",
];

function FadeIn({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`transition-all duration-300 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}>
      {children}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2 w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-nexus-muted animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * Props let a Real-World NLP application card seed a contextual starter
 * question (e.g. clicking "Ask NLP Assistant" on the Sentiment Analysis
 * card seeds "Explain how sentiment analysis is used in product reviews.").
 * seedKey must change (not just seedMessage) to re-trigger the same seed twice.
 */
export default function NlpLearningAssistant({
  seedMessage,
  seedKey,
}: {
  seedMessage?: string | null;
  seedKey?: number;
}) {
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      blocks: [
        { type: "heading", text: "NLP Learning Assistant" },
        {
          type: "text",
          text: "Ask me about any NLP concept taught on this platform — a definition, an example, code, a numerical, a viva question, or a challenge. I'm a rule-based tutor over a structured knowledge base, not a language model.",
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState<AssistantContext | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  useEffect(() => {
    if (seedMessage) send(seedMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  const setLearningMode = (mode: Difficulty) => {
    setDifficulty(mode);
    setContext((prev) => ({ ...(prev ?? {}), difficulty: mode }));
  };

  const send = async (raw?: string) => {
    const message = (raw ?? input).trim();
    if (!message || loading) return;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const mergedContext = context ? { ...context, difficulty } : { difficulty };
      const r = await askAssistant(message, mergedContext);
      setContext(r.context);
      setTurns((t) => [
        ...t,
        { role: "assistant", blocks: r.blocks, relatedLab: r.relatedLab, suggestedActions: r.suggestedActions },
      ]);
      setSuggestions(r.suggestedQuestions.length ? r.suggestedQuestions : DEFAULT_SUGGESTIONS);
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-nexus-border bg-nexus-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nexus-border px-4 py-3 bg-gradient-to-r from-nexus-surfaceAlt to-nexus-surface">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-nexus-accent/10 p-1.5">
            <Brain size={16} className="text-nexus-accent" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-nexus-text leading-tight">NLP Learning Assistant</p>
            <p className="text-[11px] text-nexus-muted leading-tight">Your interactive NLP tutor</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-nexus-border bg-nexus-bg/60 p-0.5">
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setLearningMode(mode)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium capitalize transition-colors ${
                difficulty === mode ? "bg-nexus-yellow text-nexus-ink" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="max-h-96 overflow-y-auto px-4 py-4 space-y-4">
        {turns.map((t, i) => (
          <FadeIn key={i}>
            {t.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-nexus-accent px-3 py-2 text-sm text-white">{t.text}</div>
              </div>
            ) : (
              <div className="max-w-[95%] space-y-2.5">
                {t.blocks && <AssistantBlockList blocks={t.blocks} />}
                {t.relatedLab && (
                  <div className="flex items-center justify-between rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-nexus-muted">
                      <BookOpen size={13} className="text-nexus-accent" />
                      <span>
                        📚 Related Lab — <span className="text-nexus-text">{t.relatedLab.name}</span>
                      </span>
                    </div>
                    <Link
                      to={t.relatedLab.route}
                      className="text-xs font-medium text-nexus-accent hover:text-nexus-data whitespace-nowrap"
                    >
                      Open Lab →
                    </Link>
                  </div>
                )}
                {t.suggestedActions && t.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.suggestedActions.map((action) =>
                      action === "Go To Lab" && t.relatedLab ? (
                        <Link
                          key={action}
                          to={t.relatedLab.route}
                          className="text-[11px] rounded-full border border-nexus-border px-2.5 py-1 text-nexus-muted hover:text-nexus-accent hover:border-nexus-accentDim transition-colors"
                        >
                          Go To Lab
                        </Link>
                      ) : (
                        <button
                          key={action}
                          onClick={() => send(ACTION_MESSAGES[action] ?? action)}
                          className="text-[11px] rounded-full border border-nexus-border px-2.5 py-1 text-nexus-muted hover:text-nexus-accent hover:border-nexus-accentDim transition-colors"
                        >
                          {action}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </FadeIn>
        ))}
        {loading && <TypingIndicator />}
      </div>

      {error && (
        <div className="px-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {/* Suggested questions */}
      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="text-[11px] rounded-full border border-nexus-border bg-nexus-surfaceAlt px-2.5 py-1 text-nexus-muted hover:text-nexus-accent hover:border-nexus-accentDim transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-nexus-border px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask your NLP question…"
          className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-nexus-accent p-2.5 text-white hover:bg-nexus-accent/90 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="px-4 pb-3 text-[11px] text-nexus-muted/80 italic">
        Rule-based intent detection over a structured NLP knowledge base — not a language model.
      </p>
    </div>
  );
}
