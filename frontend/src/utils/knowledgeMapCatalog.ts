import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Boxes,
  FileText,
  GitBranch,
  GitCompareArrows,
  HelpCircle,
  Languages,
  Layers,
  Network,
  Newspaper,
  Smile,
  Sparkles,
  Type,
  Workflow,
} from "lucide-react";

// Backs the redesigned Dashboard "NLP Knowledge Map" (components/KnowledgeMap.tsx).
//
// IMPORTANT — this catalog is a presentation layer over the REAL, existing
// progress system (utils/progressCatalog.ts / backend
// app/algorithms/progress_catalog.py), not a new one. Every `moduleId`
// below is one of the five real NLP module_ids that already exist on
// trackable pages (see each page's <LessonCompleteButton>) and are already
// validated server-side — nothing here invents a module_id, a route, or a
// progress value.
//
// The NLP syllabus genuinely only has 5 separately-completable NLP lab
// pages, but this map (and the spec it was built from) wants 13 named
// topics across 4 categories. Several named topics are different facets of
// ONE real lab page and therefore share one real moduleId on purpose —
// that's not a shortcut, it's what's actually true:
//   - Tokenization & Morphology both live on the Text Processing lab
//     (/preprocessing, moduleId "preprocessing") — tokenization, stemming,
//     lemmatization and morphology are all sections of that one page.
//   - Parsing, CYK, and PCFG are all the Parsing Lab (/parsing, moduleId
//     "parsing") — the CYK (bottom-up) and PCFG-style top-down parses run
//     side by side on that one page.
//   - WSD, WordNet, and Similarity are all the Semantic Lab (/semantics,
//     moduleId "semantics") — each is one of that page's own tabs (passed
//     through as a `?tab=` deep link below).
//   - Translation, Summarization, Sentiment, and QA are all Real-World NLP
//     (/applications, moduleId "nlp-applications") — each is one of that
//     page's expandable application cards (passed through as a `?app=`
//     deep link below).
// Topics that share a moduleId always show the exact same real completion
// state, because completing that one lab page is the one real action that
// covers all of them — KnowledgeMap.tsx relies on this file's groupings to
// decide when a "locked until" dependency is even meaningful (it isn't,
// between two topics on the same page).
export interface KnowledgeMapTopic {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Real backend module_id this topic's completion is read from (see progressCatalog.ts). */
  moduleId: string;
  /** Real existing route this topic navigates to — never a new/duplicate page. */
  path: string;
  /** Optional deep link into an existing tab/section of that route, appended as a query string. */
  query?: Record<string, string>;
  /** Optional anchor (e.g. "tokenization") to scroll to on that same route — see PreprocessingLab.tsx's on-mount scroll effect. Passed without a leading "#". */
  hash?: string;
}

export interface KnowledgeMapCategory {
  id: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Tailwind color token (see tailwind.config.js `nexus.*`) — theme-reactive, not a raw hex. */
  accent: "purple" | "accent" | "data" | "gold";
  topics: KnowledgeMapTopic[];
}

export const KNOWLEDGE_MAP: KnowledgeMapCategory[] = [
  {
    id: "foundations",
    label: "Foundations",
    subtitle: "Build the core concepts of Natural Language Processing",
    icon: BookOpen,
    accent: "purple",
    topics: [
      {
        id: "tokenization",
        label: "Tokenization",
        description: "Learn how text is split into meaningful units called tokens.",
        icon: Type,
        moduleId: "preprocessing",
        path: "/preprocessing",
        hash: "tokenization",
      },
      {
        id: "morphology",
        label: "Morphology",
        description: "Understand how words are structured and how their forms change.",
        icon: Layers,
        moduleId: "preprocessing",
        path: "/preprocessing",
        hash: "morphology",
      },
      {
        id: "language-models",
        label: "Language Models",
        description: "Explore statistical and neural language models.",
        icon: FileText,
        moduleId: "language-modeling",
        path: "/language-modeling",
      },
    ],
  },
  {
    id: "syntax",
    label: "Syntax",
    subtitle: "Discover how sentence structure is parsed and represented",
    icon: GitBranch,
    accent: "accent",
    topics: [
      {
        id: "parsing",
        label: "Parsing",
        description: "See a real bottom-up and top-down parser build a sentence's structure.",
        icon: GitBranch,
        moduleId: "parsing",
        path: "/parsing",
      },
      {
        id: "cyk",
        label: "CYK",
        description: "Watch the CYK chart fill in span by span, bottom-up.",
        icon: Network,
        moduleId: "parsing",
        path: "/parsing",
      },
      {
        id: "pcfg",
        label: "PCFG",
        description: "Follow a top-down, leftmost-derivation parse of the same sentence.",
        icon: Workflow,
        moduleId: "parsing",
        path: "/parsing",
      },
    ],
  },
  {
    id: "semantics",
    label: "Semantics",
    subtitle: "Learn how meaning is represented, compared, and disambiguated",
    icon: Sparkles,
    accent: "data",
    topics: [
      {
        id: "wsd",
        label: "WSD",
        description: "Disambiguate which sense of a word is meant in context.",
        icon: Sparkles,
        moduleId: "semantics",
        path: "/semantics",
        query: { tab: "wsd" },
      },
      {
        id: "wordnet",
        label: "WordNet",
        description: "Explore real WordNet relations between words and senses.",
        icon: BookOpen,
        moduleId: "semantics",
        path: "/semantics",
        query: { tab: "wordnet" },
      },
      {
        id: "similarity",
        label: "Similarity",
        description: "Compare Jaccard and cosine similarity between two texts.",
        icon: GitCompareArrows,
        moduleId: "semantics",
        path: "/semantics",
        query: { tab: "similarity" },
      },
    ],
  },
  {
    id: "applications",
    label: "Applications",
    subtitle: "See NLP at work in real, everyday systems",
    icon: Boxes,
    accent: "gold",
    topics: [
      {
        id: "translation",
        label: "Translation",
        description: "Translate text between languages using a real translation service.",
        icon: Languages,
        moduleId: "nlp-applications",
        path: "/applications",
        query: { app: "translation" },
      },
      {
        id: "summarization",
        label: "Summarization",
        description: "Condense a long document down to its most important sentences.",
        icon: Newspaper,
        moduleId: "nlp-applications",
        path: "/applications",
        query: { app: "summarization" },
      },
      {
        id: "sentiment",
        label: "Sentiment",
        description: "Understand whether text expresses positive, negative, or neutral sentiment.",
        icon: Smile,
        moduleId: "nlp-applications",
        path: "/applications",
        query: { app: "sentiment" },
      },
      {
        id: "qa",
        label: "Question Answering",
        description: "See a real system pull an answer span out of a passage of text.",
        icon: HelpCircle,
        moduleId: "nlp-applications",
        path: "/applications",
        query: { app: "qa" },
      },
    ],
  },
];

export const ALL_KNOWLEDGE_MAP_TOPICS: KnowledgeMapTopic[] = KNOWLEDGE_MAP.flatMap((c) => c.topics);
