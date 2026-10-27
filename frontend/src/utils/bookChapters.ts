import type { ContentBlock } from "./bookBlocks";

// One chapter's real content, authored once as plain data (see
// nlpBookChapters.ts / dlBookChapters.ts) and turned into physical book
// pages by utils/bookPagination.ts. "number" is a display label only
// ("01") — chapters are still just array order underneath, so reordering
// a chapter later never means renumbering ids used elsewhere (deep links
// target `id`, never the chapter number).
export interface BookChapter {
  id: string;
  number: string;
  title: string;
  /** One or two sentences shown on the chapter's opening page, under the
   * title — the "short intro" every interactive lab page's "Read this
   * concept" link lands a student on, before the fuller content below. */
  intro: string;
  blocks: ContentBlock[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}
