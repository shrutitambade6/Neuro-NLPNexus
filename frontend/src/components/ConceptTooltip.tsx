import { useState } from "react";

import { CONCEPTS } from "../data/concepts";
import { usePreferencesStore } from "../store/preferencesStore";

interface Props {
  term: keyof typeof CONCEPTS;
  children?: React.ReactNode;
}

/**
 * Wraps a technical term with a subtle underline. Hover/focus/click reveals
 * a definition card sourced from the data-driven glossary in data/concepts.ts.
 * Only wrap genuinely technical vocabulary with this — not ordinary words.
 *
 * Redesign Stage 2: Settings -> Learning Preferences -> "Term tooltips"
 * lets a student switch this to click-only (via preferencesStore) — some
 * students on touch devices or who find hover popups distracting would
 * rather click deliberately. Click always works either way; only
 * hover/focus are gated behind the preference.
 */
export default function ConceptTooltip({ term, children }: Props) {
  const [open, setOpen] = useState(false);
  const hoverEnabled = usePreferencesStore((s) => s.tooltipTrigger) !== "click-only";
  const entry = CONCEPTS[term];
  if (!entry) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={hoverEnabled ? () => setOpen(true) : undefined}
        onMouseLeave={hoverEnabled ? () => setOpen(false) : undefined}
        onFocus={hoverEnabled ? () => setOpen(true) : undefined}
        onBlur={hoverEnabled ? () => setOpen(false) : undefined}
        onClick={() => setOpen((o) => !o)}
        className="underline decoration-dotted decoration-nexus-accent/60 underline-offset-2 text-inherit font-inherit bg-transparent border-none p-0 cursor-help"
        aria-describedby={`tooltip-${term}`}
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          id={`tooltip-${term}`}
          role="tooltip"
          className="absolute z-20 left-0 top-full mt-2 w-64 rounded-lg border border-nexus-border bg-nexus-surface p-3 text-xs shadow-xl"
        >
          <span className="block font-semibold text-nexus-text mb-1">{entry.term}</span>
          <span className="block text-nexus-muted mb-1.5">{entry.definition}</span>
          <span className="block text-nexus-data">Simple: {entry.simple}</span>
          {entry.example && (
            <span className="block text-nexus-muted mt-1.5 italic">Example: {entry.example}</span>
          )}
        </span>
      )}
    </span>
  );
}
