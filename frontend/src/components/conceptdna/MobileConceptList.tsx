import type { ConceptState } from "../../services/api";
import { STATUS_DOT } from "./conceptDnaTheme";

// Spec point 18 — mobile responsive rule: "Do NOT squeeze the entire
// graph. Use: Concept list → concept detail → focused mini graph."
// This is that list — the same concepts/statuses as the desktop graph,
// just as a scannable list instead of a spatial layout, which is what
// actually works on a narrow screen.
export default function MobileConceptList({
  concepts,
  selectedId,
  onSelect,
}: {
  concepts: ConceptState[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nlp = concepts.filter((c) => c.domain === "nlp");
  const dl = concepts.filter((c) => c.domain === "dl");

  return (
    <div className="space-y-4">
      <ConceptGroup title="NLP" items={nlp} selectedId={selectedId} onSelect={onSelect} />
      <ConceptGroup title="Deep Learning" items={dl} selectedId={selectedId} onSelect={onSelect} />
    </div>
  );
}

function ConceptGroup({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: ConceptState[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-nexus-muted mb-1.5">{title}</p>
      <div className="space-y-1">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selectedId === c.id ? "border-nexus-accentDim bg-nexus-accent/10" : "border-nexus-border bg-nexus-surface hover:border-nexus-accentDim"
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span>{STATUS_DOT[c.status]}</span>
              <span className="truncate">{c.label}</span>
            </span>
            {c.status !== "locked" && c.status !== "not_started" && (
              <span className="text-xs text-nexus-muted shrink-0">{c.mastery_score}%</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
