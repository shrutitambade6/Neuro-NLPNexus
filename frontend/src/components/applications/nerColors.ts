// Shared entity-label -> color mapping used by every demo that highlights
// NER output (NerDemo, DocumentAnalysisDemo, SocialMediaDemo) so the same
// category always reads the same color across the whole Real-World NLP page.
export const ENTITY_COLORS: Record<string, string> = {
  PERSON: "bg-nexus-accent/20 text-nexus-accent border-nexus-accent/40",
  LOCATION: "bg-nexus-good/20 text-nexus-good border-nexus-good/40",
  ORGANIZATION: "bg-nexus-purple/20 text-nexus-purple border-nexus-purple/40",
  DATE: "bg-nexus-yellow/20 text-nexus-yellow border-nexus-yellow/40",
  MONEY: "bg-nexus-gold/20 text-nexus-gold border-nexus-gold/40",
  PRODUCT: "bg-nexus-data/20 text-nexus-data border-nexus-data/40",
  // Deliberately neutral/gray -- the standard CoNLL-style catch-all for a
  // real, specific named entity (an event, a competition, a nationality)
  // that just doesn't fit any of the categories above, e.g. "FIFA World
  // Cup". Same tone as the unknown-label fallback below on purpose.
  MISC: "bg-nexus-surfaceAlt text-nexus-muted border-nexus-border",

  // spaCy's own OntoNotes label set (opt-in "pretrained model" engine,
  // see NerDemo). Reuses the closest conceptual color above where one
  // exists (GPE/LOC -> LOCATION's green, ORG -> ORGANIZATION's purple,
  // TIME -> DATE's yellow) rather than inventing a new color for the
  // same idea, and gives the rest their own tone so a dense paragraph
  // doesn't collapse into one or two colors.
  GPE: "bg-nexus-good/20 text-nexus-good border-nexus-good/40",
  LOC: "bg-nexus-good/20 text-nexus-good border-nexus-good/40",
  ORG: "bg-nexus-purple/20 text-nexus-purple border-nexus-purple/40",
  TIME: "bg-nexus-yellow/20 text-nexus-yellow border-nexus-yellow/40",
  NORP: "bg-nexus-warn/20 text-nexus-warn border-nexus-warn/40",
  FAC: "bg-nexus-plannerRose/20 text-nexus-plannerRose border-nexus-plannerRose/40",
  EVENT: "bg-nexus-surfaceAlt text-nexus-muted border-nexus-border",
  WORK_OF_ART: "bg-nexus-posPredicate/20 text-nexus-posPredicate border-nexus-posPredicate/40",
  LAW: "bg-nexus-warn/20 text-nexus-warn border-nexus-warn/40",
  LANGUAGE: "bg-nexus-posPredicate/20 text-nexus-posPredicate border-nexus-posPredicate/40",
  PERCENT: "bg-nexus-gold/20 text-nexus-gold border-nexus-gold/40",
  QUANTITY: "bg-nexus-gold/20 text-nexus-gold border-nexus-gold/40",
  ORDINAL: "bg-nexus-data/20 text-nexus-data border-nexus-data/40",
  CARDINAL: "bg-nexus-data/20 text-nexus-data border-nexus-data/40",
};

export function entityColor(label: string): string {
  return ENTITY_COLORS[label] ?? "bg-nexus-surfaceAlt text-nexus-muted border-nexus-border";
}

interface Entity {
  text: string;
  start: number;
  end: number;
  label: string;
}

/** Splits `text` into plain/entity segments so a component can render
 * highlighted spans without any extra NLP — the split points come directly
 * from the backend's real character offsets. */
export function buildHighlightSegments(text: string, entities: Entity[]) {
  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const segments: { text: string; label: string | null }[] = [];
  let cursor = 0;
  for (const e of sorted) {
    if (e.start > cursor) segments.push({ text: text.slice(cursor, e.start), label: null });
    segments.push({ text: text.slice(e.start, e.end), label: e.label });
    cursor = e.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), label: null });
  return segments;
}
