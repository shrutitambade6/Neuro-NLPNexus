import { useMemo, useState } from "react";
import { Eraser, Shuffle } from "lucide-react";
import axios from "axios";

import { extractEntities, type NerEngine, type NerResponse } from "../../services/api";
import { BACKEND_ERROR, ErrorBanner, RunButton } from "./AppShared";
import { buildHighlightSegments, entityColor } from "./nerColors";

const EXAMPLES = [
  "Shruti visited Mumbai University on Monday and paid $500.",
  "The FIFA World Cup is an international association football competition among the senior men's national teams of the members of the Fédération Internationale de Football Association (FIFA).",
  "Microsoft opened a new office in Bengaluru, and Dr. A. P. J. Abdul Kalam was born in Rameswaram.",
  "Rahul met Priya in New Delhi on 3 January 2026, and the company reported a 12% increase in revenue.",
];

const ENGINES: { id: NerEngine; label: string; description: string }[] = [
  {
    id: "rule_based",
    label: "Rule-based (default)",
    description: "This project's own gazetteer NER — small curated word lists and regex patterns, not a trained model. Every entity it finds traces back to one specific rule.",
  },
  {
    id: "spacy",
    label: "spaCy (pretrained model)",
    description: "A real trained statistical model (spaCy's en_core_web_sm), for comparison. More accurate on unfamiliar text, but it's a black box — you can't point to the rule that produced any one answer, and it can still be confidently wrong.",
  },
];

export default function NerDemo() {
  const [text, setText] = useState(EXAMPLES[0]);
  const [engine, setEngine] = useState<NerEngine>("rule_based");
  const [result, setResult] = useState<NerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [view, setView] = useState<"highlighted" | "table">("highlighted");

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await extractEntities(text, engine));
    } catch (err) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.detail === "string") {
        setError(err.response.data.detail);
      } else {
        setError(BACKEND_ERROR);
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setText("");
    setResult(null);
    setError(null);
    setActiveFilter(null);
  };

  const loadExample = () => {
    const next = (exampleIndex + 1) % EXAMPLES.length;
    setExampleIndex(next);
    setText(EXAMPLES[next]);
    setResult(null);
    setError(null);
    setActiveFilter(null);
  };

  const segments = useMemo(
    () => (result ? buildHighlightSegments(result.text, result.entities) : []),
    [result]
  );

  const filteredEntities = useMemo(() => {
    if (!result) return [];
    return activeFilter ? result.entities.filter((e) => e.label === activeFilter) : result.entities;
  }, [result, activeFilter]);

  const distinctCount = useMemo(() => {
    if (!result) return 0;
    return new Set(result.entities.map((e) => `${e.label}:${e.text.toLowerCase()}`)).size;
  }, [result]);

  const countsByLabel = useMemo(() => {
    if (!result) return [] as { label: string; count: number }[];
    const counts = new Map<string, number>();
    for (const e of result.entities) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [result]);

  const labelDisplayByLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of result?.entities ?? []) map[e.label] = e.label_display ?? e.label;
    return map;
  }, [result]);

  const activeEngine = ENGINES.find((e) => e.id === engine)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            onClick={() => setEngine(e.id)}
            className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
              engine === e.id
                ? "bg-nexus-accent/20 border-nexus-accent/50 text-nexus-accent font-medium"
                : "bg-nexus-bg border-nexus-border text-nexus-muted hover:border-nexus-accent/30"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-nexus-muted/80 italic">{activeEngine.description}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Enter a sentence or paragraph with names, places, dates…"
        className="w-full rounded-lg bg-nexus-bg border border-nexus-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nexus-accent/50"
      />
      <div className="flex flex-wrap items-center gap-2">
        <RunButton onClick={run} loading={loading} label="Find Entities" disabled={!text.trim()} />
        <button
          onClick={loadExample}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-accent/30 hover:text-nexus-fg transition-colors"
        >
          <Shuffle size={12} /> Load Example
        </button>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-2 text-xs text-nexus-muted hover:border-nexus-bad/40 hover:text-nexus-bad transition-colors"
        >
          <Eraser size={12} /> Clear
        </button>
      </div>
      {error && <ErrorBanner message={error} />}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg border border-nexus-border p-0.5 text-xs">
              {(["highlighted", "table"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-2 py-1 transition-colors ${
                    view === v ? "bg-nexus-accent/20 text-nexus-accent" : "text-nexus-muted hover:text-nexus-fg"
                  }`}
                >
                  {v === "highlighted" ? "Highlighted text" : "Extracted entities"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-nexus-muted">
              engine: <span className="text-nexus-fg font-medium">{result.engine}</span>
            </span>
          </div>

          {view === "highlighted" ? (
            <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-4 text-sm leading-relaxed">
              {segments.map((seg, i) =>
                seg.label ? (
                  <span
                    key={i}
                    title={labelDisplayByLabel[seg.label] ?? seg.label}
                    className={`rounded px-1 py-0.5 border mx-0.5 font-medium ${entityColor(seg.label)} ${
                      activeFilter && seg.label !== activeFilter ? "opacity-30" : ""
                    }`}
                  >
                    {seg.text}
                    <sup className="ml-1 text-[9px] opacity-80">{seg.label}</sup>
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-nexus-border bg-nexus-surfaceAlt overflow-hidden">
              {filteredEntities.length === 0 ? (
                <p className="p-4 text-xs text-nexus-muted">No entities match this filter.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-nexus-bg text-nexus-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Text</th>
                      <th className="text-left px-3 py-2 font-medium">Category</th>
                      <th className="text-left px-3 py-2 font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.map((e, i) => (
                      <tr key={i} className="border-t border-nexus-border">
                        <td className="px-3 py-2 font-medium">{e.text}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 border text-[10px] ${entityColor(e.label)}`}>
                            {e.label_display ?? e.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-nexus-muted">
                          {e.start}–{e.end}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {result.entities.length === 0 ? (
            <p className="text-xs text-nexus-muted">
              No entities found in this text by the {result.engine === "spacy" ? "spaCy model" : "rule-based checks"}{" "}
              below — that's a real result, not a failed request.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3 text-[11px] text-nexus-muted">
              <span>
                <span className="text-nexus-fg font-medium">{result.entities.length}</span> total mention
                {result.entities.length === 1 ? "" : "s"}
              </span>
              <span>
                <span className="text-nexus-fg font-medium">{distinctCount}</span> distinct (same text + category
                counted once)
              </span>
              {countsByLabel.map(({ label, count }) => (
                <span key={label}>
                  {count} × {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {result.supported_labels.map((l) => (
              <button
                key={l}
                onClick={() => setActiveFilter(activeFilter === l ? null : l)}
                className={`text-[10px] rounded-full px-2 py-0.5 border transition-opacity ${entityColor(l)} ${
                  activeFilter && activeFilter !== l ? "opacity-40" : ""
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {activeFilter && (
            <p className="text-[10px] text-nexus-muted">
              Filtering to <span className="font-medium">{activeFilter}</span> —{" "}
              <button onClick={() => setActiveFilter(null)} className="underline hover:text-nexus-fg">
                clear filter
              </button>
            </p>
          )}

          <p className="text-[11px] text-nexus-muted/80 italic">
            {result.engine === "spacy"
              ? "Real pretrained model (spaCy en_core_web_sm) — meaningfully more accurate on unfamiliar text than the rule-based engine, but it's a trained statistical model: it can be confidently wrong, especially on names/places outside its training data, and there's no single traceable rule to point to for any one answer."
              : "Rule-based / gazetteer NER — small curated word lists and regex patterns, not a trained model. It will miss entities a real trained NER system would catch — try the spaCy engine above to compare."}
          </p>
        </div>
      )}
    </div>
  );
}
