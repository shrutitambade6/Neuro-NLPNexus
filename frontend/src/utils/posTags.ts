// Shared POS-tag presentation data for the POS Tagging Lab (and the NLP
// Learning Hub's summary card). Colors are grouped by grammatical family
// rather than given one hue per tag — see index.css's --nexus-posNominal/
// posPredicate/posFunction comment for why (11 tags is past the reliable
// color-identity cap; every badge below ALSO always renders the exact tag
// text, so color only ever reinforces the family, never carries identity
// alone).
export type PosFamily = "nominal" | "predicate" | "function" | "punct";

export const TAG_FAMILY: Record<string, PosFamily> = {
  NOUN: "nominal",
  PROPN: "nominal",
  PRON: "nominal",
  VERB: "predicate",
  ADJ: "predicate",
  ADV: "predicate",
  DET: "function",
  ADP: "function",
  CONJ: "function",
  NUM: "function",
  PUNCT: "punct",
};

export const FAMILY_LABEL: Record<PosFamily, string> = {
  nominal: "Naming words",
  predicate: "Action & description words",
  function: "Connector / structure words",
  punct: "Punctuation",
};

export const FAMILY_CLASSES: Record<
  PosFamily,
  { text: string; bg: string; border: string; bgSoft: string }
> = {
  nominal: {
    text: "text-nexus-posNominal",
    bg: "bg-nexus-posNominal",
    border: "border-nexus-posNominal",
    bgSoft: "bg-nexus-posNominal/15",
  },
  predicate: {
    text: "text-nexus-posPredicate",
    bg: "bg-nexus-posPredicate",
    border: "border-nexus-posPredicate",
    bgSoft: "bg-nexus-posPredicate/15",
  },
  function: {
    text: "text-nexus-posFunction",
    bg: "bg-nexus-posFunction",
    border: "border-nexus-posFunction",
    bgSoft: "bg-nexus-posFunction/15",
  },
  punct: {
    text: "text-nexus-muted",
    bg: "bg-nexus-muted",
    border: "border-nexus-muted",
    bgSoft: "bg-nexus-muted/15",
  },
};

export function familyOf(tag: string): PosFamily {
  return TAG_FAMILY[tag] ?? "nominal";
}
