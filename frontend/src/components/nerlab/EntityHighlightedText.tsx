import { buildHighlightSegments, entityColor } from "../applications/nerColors";
import type { NerPlaygroundEntity } from "../../services/api";

interface Props {
  text: string;
  entities: NerPlaygroundEntity[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  compact?: boolean;
}

// Shared read-only highlighted-text renderer, used both by the live
// "Panel B" text box (a smaller inline preview) and the Output panel's
// "Highlighted Text" tab (a larger, dedicated view). Both read from the
// exact same `result.entities` + real character offsets the backend
// returned -- never a second/approximate rendering.
export default function EntityHighlightedText({ text, entities, selectedIndex, onSelect, compact }: Props) {
  const segments = buildHighlightSegments(text, entities);
  // buildHighlightSegments doesn't carry the original entity index, so we
  // track our own cursor through the sorted entity list to map each
  // highlighted segment back to its index in `entities` (needed so
  // clicking a span can select the *same* entity the Entities/JSON tabs
  // show, keeping all three views in sync).
  const sortedWithIndex = [...entities]
    .map((e, i) => ({ ...e, originalIndex: i }))
    .sort((a, b) => a.start - b.start);
  let entityCursor = 0;

  return (
    <div
      className={`rounded-xl border border-nexus-border bg-nexus-surfaceAlt leading-relaxed ${
        compact ? "p-3 text-xs" : "p-4 text-sm"
      }`}
    >
      {text.trim() === "" ? (
        <p className="text-nexus-muted italic">No input text yet.</p>
      ) : (
        segments.map((seg, i) => {
          if (seg.label === null) return <span key={i}>{seg.text}</span>;
          const match = sortedWithIndex[entityCursor];
          entityCursor += 1;
          const idx = match ? match.originalIndex : -1;
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={i}
              type="button"
              onClick={() => idx >= 0 && onSelect(idx)}
              title={seg.label}
              className={`rounded px-1 py-0.5 border mx-0.5 font-medium transition-shadow ${entityColor(seg.label)} ${
                isSelected ? "ring-2 ring-nexus-accent ring-offset-1 ring-offset-nexus-surfaceAlt" : ""
              }`}
            >
              {seg.text}
              <sup className="ml-1 text-[9px] opacity-80">{seg.label}</sup>
            </button>
          );
        })
      )}
    </div>
  );
}
