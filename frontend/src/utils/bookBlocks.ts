// Content-block model for the Interactive Learning Books' real chapter
// content (the "Theory -> Books" migration milestone).
//
// Why a block model instead of one long body string: the spec this
// migration follows asks for a consistent per-concept structure (concept,
// why it matters, how it works, example, key terms, advantages,
// limitations, application, recap) rendered as distinct, reusable visual
// components ("Definition Box", "Example Box", ...) rather than walls of
// paragraph text. A chapter is authored once as an ordered array of these
// blocks (see utils/nlpBookChapters.ts / dlBookChapters.ts); utils/
// bookPagination.ts then flows that array across as many physical pages as
// it actually needs — nobody hand-counts how much text fits on one page.
export type ContentBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "definition"; label?: string; text: string }
  | { kind: "example"; label?: string; text: string }
  | { kind: "important"; label?: string; text: string }
  | { kind: "tip"; label?: string; text: string }
  | { kind: "formula"; label?: string; formula: string; note?: string }
  | { kind: "code"; label?: string; code: string }
  | { kind: "keyTerms"; terms: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "flow"; steps: string[] }
  | { kind: "recap"; points: string[] }
  | { kind: "glossaryList"; entries: { term: string; definition: string }[] }
  | { kind: "thinkAboutIt"; label?: string; text: string };

// A rough "how much of one physical page does this block use" weight, used
// only by the greedy pagination packer (utils/bookPagination.ts) — not
// pixel-accurate, just enough to stop five short definitions and one giant
// table from being treated as equally sized. Tuned once empirically; see
// that file's own comment for what happens when a page still overflows
// (it scrolls — content is never clipped or silently dropped).
export function blockWeight(block: ContentBlock): number {
  switch (block.kind) {
    case "subheading":
      return 0.3;
    case "paragraph":
    case "definition":
    case "example":
    case "important":
    case "tip":
    case "formula":
      return 1;
    case "keyTerms":
      return 0.6;
    case "code":
      return 1.6;
    case "table":
      return 0.5 + block.rows.length * 0.35;
    case "flow":
      return 0.4 + block.steps.length * 0.3;
    case "recap":
      return 0.4 + block.points.length * 0.25;
    case "glossaryList":
      return 0.6 + block.entries.length * 0.55;
    case "thinkAboutIt":
      return 1;
    default:
      return 1;
  }
}
