import type { ContentBlock } from "./bookBlocks";
import { blockWeight } from "./bookBlocks";
import type { BookChapter } from "./bookChapters";

// Physical-page types + the chapter -> pages -> spreads builder.
//
// Deliberately owns BookPageFace/BookSpread itself (bookCatalog.ts imports
// them from here, never the other way around) so there is exactly one
// direction of dependency: chapter DATA (nlpBookChapters.ts/
// dlBookChapters.ts) -> this pagination engine -> bookCatalog.ts's
// BookTheme objects -> InteractiveBook.tsx. No file needs to know how any
// other layer works.
export type BookPageFace =
  | { kind: "title"; kicker?: string; heading: string; tagline?: string }
  | { kind: "toc"; heading: string; entries: TocEntry[] }
  | {
      /** A chapter's own dedicated, minimal divider page (point 15 of the
       * physical-book redesign spec) — number, title, and intro only, no
       * content blocks. buildBookSpreads() inserts exactly one of these
       * immediately before a chapter's real content pages; it is never
       * counted in pageInChapter/totalPagesInChapter below, since those
       * drive real reading-progress completion off the actual content. */
      kind: "chapterOpening";
      chapterId: string;
      chapterLabel: string;
      heading: string;
      intro?: string;
    }
  | {
      kind: "chapter";
      chapterId: string;
      chapterLabel: string;
      heading: string;
      /** Only set on a chapter's first physical page. */
      intro?: string;
      blocks: ContentBlock[];
      /** Only set on a chapter's first physical page, when it has one. */
      continued?: boolean;
      /** 0-based position of this page within its chapter, and how many
       * pages that chapter has in total — what InteractiveBook.tsx uses to
       * decide when a chapter has genuinely been read to its end, for the
       * real reading-progress/"Resume reading" feature (never guessed from
       * time-on-page or scroll position). */
      pageInChapter: number;
      totalPagesInChapter: number;
    };

export interface TocEntry {
  chapterId: string;
  chapterLabel: string;
  title: string;
  spreadIndex: number;
  side: "left" | "right";
}

export interface BookSpread {
  left: BookPageFace;
  right: BookPageFace;
}

const PAGE_WEIGHT_BUDGET = 2.5;
// A chapter's opening page always carries its heading + 1-2 sentence
// intro — this fixed cost keeps the packer from also stuffing a big table
// onto the same page as a fresh chapter heading.
const OPENING_PAGE_FIXED_COST = 0.9;

function packChapterPages(chapter: BookChapter): BookPageFace[] {
  const pages: BookPageFace[] = [];
  let current: ContentBlock[] = [];
  let currentWeight = 0;
  let isFirstPage = true;

  const flush = () => {
    if (current.length === 0 && !isFirstPage) return;
    pages.push({
      kind: "chapter",
      chapterId: chapter.id,
      chapterLabel: chapter.number,
      heading: chapter.title,
      continued: !isFirstPage,
      blocks: current,
      pageInChapter: 0,
      totalPagesInChapter: 0,
    });
    current = [];
    currentWeight = isFirstPage ? 0 : 0;
    isFirstPage = false;
  };

  for (const block of chapter.blocks) {
    const w = blockWeight(block);
    const fixedCost = isFirstPage ? OPENING_PAGE_FIXED_COST : 0;
    // A single oversized block (e.g. a long glossary list) always gets
    // its own page rather than being split — BookPage's content area
    // scrolls, so nothing is ever clipped even if one block alone
    // exceeds the normal budget.
    if (current.length > 0 && fixedCost + currentWeight + w > PAGE_WEIGHT_BUDGET) {
      flush();
      current.push(block);
      currentWeight = w;
    } else {
      current.push(block);
      currentWeight += w;
    }
  }
  flush();
  // A chapter with zero blocks still gets its one divider/intro page.
  if (pages.length === 0) {
    pages.push({
      kind: "chapter",
      chapterId: chapter.id,
      chapterLabel: chapter.number,
      heading: chapter.title,
      blocks: [],
      pageInChapter: 0,
      totalPagesInChapter: 0,
    });
  }
  pages.forEach((p, idx) => {
    if (p.kind === "chapter") {
      p.pageInChapter = idx;
      p.totalPagesInChapter = pages.length;
    }
  });
  return pages;
}

export function buildBookSpreads(
  bookTitleFace: Extract<BookPageFace, { kind: "title" }>,
  tocHeading: string,
  chapters: BookChapter[],
): { spreads: BookSpread[]; toc: TocEntry[] } {
  const chapterPageGroups = chapters.map(packChapterPages);

  // Flat index 0 = title, 1 = TOC — fixed, regardless of how many pages
  // the TOC itself ends up listing (it's one page; long lists scroll).
  let flatIndex = 2;
  const toc: TocEntry[] = [];
  const chapterFlatPages: BookPageFace[] = [];

  chapters.forEach((chapter, i) => {
    const pages = chapterPageGroups[i];
    const openingFace: BookPageFace = {
      kind: "chapterOpening",
      chapterId: chapter.id,
      chapterLabel: chapter.number,
      heading: chapter.title,
      intro: chapter.intro,
    };
    toc.push({
      chapterId: chapter.id,
      chapterLabel: chapter.number,
      title: chapter.title,
      spreadIndex: Math.floor(flatIndex / 2),
      side: flatIndex % 2 === 0 ? "left" : "right",
    });
    chapterFlatPages.push(openingFace, ...pages);
    flatIndex += 1 + pages.length;
  });

  const tocFace: BookPageFace = { kind: "toc", heading: tocHeading, entries: toc };
  const allPages: BookPageFace[] = [bookTitleFace, tocFace, ...chapterFlatPages];

  // Spreads are pairs — pad with a quiet closing page if the total is odd
  // so the last real page never ends up alone, cut off mid-spread.
  if (allPages.length % 2 !== 0) {
    allPages.push({
      kind: "chapter",
      chapterId: "__end__",
      chapterLabel: "",
      heading: "End of this edition",
      blocks: [
        {
          kind: "paragraph",
          text: "More chapters are added here as the platform's curriculum grows — nothing above was invented to fill space, and nothing below is either.",
        },
      ],
      pageInChapter: 0,
      totalPagesInChapter: 1,
    });
  }

  const spreads: BookSpread[] = [];
  for (let i = 0; i < allPages.length; i += 2) {
    spreads.push({ left: allPages[i], right: allPages[i + 1] });
  }

  return { spreads, toc };
}
