import type { LucideIcon } from "lucide-react";
import { Book, BookText } from "lucide-react";

import type { BookAccentToken } from "./bookAccents";
import type { BookChapter } from "./bookChapters";
import type { BookSpread, TocEntry } from "./bookPages";
import { buildBookSpreads } from "./bookPages";
import { NLP_CHAPTERS } from "./nlpBookChapters";
import { DL_CHAPTERS } from "./dlBookChapters";

// Interactive Learning Books — content/theme configuration.
//
// Real chapters (nlpBookChapters.ts / dlBookChapters.ts) are authored once
// as plain BookChapter data — definition/example/formula/etc. blocks in
// reading order, nothing about physical pages. utils/bookPages.ts's
// buildBookSpreads() is what turns that into an actual title page, one
// Table of Contents page, and however many chapter pages each chapter's
// real content needs. Extending a book later is editing its chapters
// array — nothing here or in the rendering engine needs to change.
export interface BookTheme {
  id: "nlp" | "dl";
  route: string;
  sidebarLabel: string;
  sidebarIcon: LucideIcon;
  openLabel: string;
  title: string;
  subtitle: string;
  kicker: string;
  edition: string;
  spineLines: [string, string];
  chain: string[];
  primary: BookAccentToken;
  secondary: BookAccentToken;
  spreads: BookSpread[];
  toc: TocEntry[];
  /** "Read this concept" deep links elsewhere in the app resolve a
   * chapter id to the spread it starts on through this map, rather than
   * every call site having to know how pagination works. */
  chapterSpreadIndex: Record<string, number>;
}

interface BookMeta {
  id: "nlp" | "dl";
  route: string;
  sidebarLabel: string;
  sidebarIcon: LucideIcon;
  openLabel: string;
  title: string;
  subtitle: string;
  kicker: string;
  tagline: string;
  edition: string;
  spineLines: [string, string];
  chain: string[];
  primary: BookAccentToken;
  secondary: BookAccentToken;
  chapters: BookChapter[];
}

function makeBook(meta: BookMeta): BookTheme {
  const { spreads, toc } = buildBookSpreads(
    { kind: "title", kicker: "Welcome to", heading: meta.title, tagline: meta.tagline },
    `${meta.subtitle} — Table of Contents`,
    meta.chapters,
  );
  const chapterSpreadIndex: Record<string, number> = {};
  for (const entry of toc) chapterSpreadIndex[entry.chapterId] = entry.spreadIndex;

  return {
    id: meta.id,
    route: meta.route,
    sidebarLabel: meta.sidebarLabel,
    sidebarIcon: meta.sidebarIcon,
    openLabel: meta.openLabel,
    title: meta.title,
    subtitle: meta.subtitle,
    kicker: meta.kicker,
    edition: meta.edition,
    spineLines: meta.spineLines,
    chain: meta.chain,
    primary: meta.primary,
    secondary: meta.secondary,
    spreads,
    toc,
    chapterSpreadIndex,
  };
}

export const NLP_BOOK: BookTheme = makeBook({
  id: "nlp",
  route: "/resources/nlp-book",
  sidebarLabel: "NLP Learning Book",
  sidebarIcon: BookText,
  openLabel: "NLP Book",
  title: "NATURAL LANGUAGE PROCESSING",
  subtitle: "NLP Learning Book",
  kicker: "NATURAL LANGUAGE PROCESSING",
  tagline: "From words to intelligence — understanding how machines work with human language.",
  edition: "NLP EDITION",
  spineLines: ["NEURO NLP NEXUS", "NLP"],
  chain: ["Token", "Syntax", "Semantics", "Meaning"],
  primary: "purple",
  secondary: "accent",
  chapters: NLP_CHAPTERS,
});

export const DL_BOOK: BookTheme = makeBook({
  id: "dl",
  route: "/resources/dl-book",
  sidebarLabel: "Deep Learning Book",
  sidebarIcon: Book,
  openLabel: "Deep Learning Book",
  title: "DEEP LEARNING",
  subtitle: "Deep Learning Book",
  kicker: "DEEP LEARNING",
  tagline: "From neurons to intelligent systems — learning representations through neural networks.",
  edition: "DEEP LEARNING EDITION",
  spineLines: ["NEURO NLP NEXUS", "DEEP LEARNING"],
  chain: ["Neuron", "Layer", "Activation", "Network"],
  primary: "gold",
  secondary: "data",
  chapters: DL_CHAPTERS,
});

export const BOOKS: Record<"nlp" | "dl", BookTheme> = { nlp: NLP_BOOK, dl: DL_BOOK };
