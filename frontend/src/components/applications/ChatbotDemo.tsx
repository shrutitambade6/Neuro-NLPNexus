import { useState } from "react";

import { askChatbot } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";

interface Turn {
  role: "user" | "bot";
  text: string;
}

export default function ChatbotDemo() {
  const [input, setInput] = useState("What is tokenization?");
  const [turns, setTurns] = useState<Turn[]>([
    { role: "bot", text: "Ask me about an NLP concept — I'm a rule-based, keyword-matching assistant, not an LLM." },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const message = input.trim();
    if (!message) return;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const r = await askChatbot(message);
      setTurns((t) => [...t, { role: "bot", text: r.answer }]);
    } catch {
      setError(BACKEND_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 space-y-3 max-h-72 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                t.role === "user" ? "bg-nexus-accent text-white" : "bg-nexus-surface border border-nexus-border"
              }`}
            >
              <p className="text-[10px] opacity-70 mb-0.5">{t.role === "user" ? "You" : "NLP Assistant"}</p>
              {t.text}
            </div>
          </div>
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about an NLP concept…"
          className="flex-1 rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
        />
        <RunButton onClick={send} loading={loading} label="Send" />
      </div>
      <p className="text-[11px] text-nexus-muted/80 italic">
        Rule-based keyword matching against a fixed knowledge base of real NLP definitions — not a language model.
      </p>
    </div>
  );
}
