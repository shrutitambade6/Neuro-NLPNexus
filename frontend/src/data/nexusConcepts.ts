// Content for the hero's "Nexus Solar System" visual (motion-first UI pass,
// 2026-10-07) — transcribed from the user's own reference infographic
// (concept names + one-line taglines + NLP-purple/DL-amber/intersection-blue
// domain coloring), not invented. Each concept links to the closest real,
// already-existing route in this app (section 29 of the spec: "reuse
// existing routing... do not invent features") — a few concepts in the
// reference image (Computer Vision, Generative AI, Topic Modeling) have no
// dedicated lab in this codebase, so they route to the nearest real hub
// page instead of a page that doesn't exist.
import type { ConceptDomain } from "./nexusConceptTypes";

export interface NexusConcept {
  id: string;
  label: string;
  /** Compact label for the always-visible on-orbit tag (section: user
   *  feedback 2026-10-07 asked every planet to carry a visible NLP/DL
   *  name, not a hover-only one) — the full `label` is still what shows
   *  in the tooltip and the click-to-focus detail panel. */
  short: string;
  tagline: string;
  domain: ConceptDomain;
  /** Orbit ring, 1 = innermost (closest to the Nexus core). */
  ring: 1 | 2 | 3;
  /** Starting angle in degrees (0 = due right, clockwise). */
  angleDeg: number;
  size: "sm" | "md" | "lg";
  hasRing?: boolean;
  level: "Foundation" | "Core" | "Advanced";
  route: string;
  connectedTo: string[];
}

export const NEXUS_CORE = {
  label: "NLP × DL",
  sub: "THE NEXUS",
  tagline: "Understanding + Learning = Intelligence",
};

export const NEXUS_CONCEPTS: NexusConcept[] = [
  {
    id: "transformers",
    label: "Transformers",
    short: "Transformers",
    tagline: "Attention across contexts",
    domain: "intersection",
    ring: 1,
    angleDeg: -60,
    size: "lg",
    hasRing: false,
    level: "Advanced",
    route: "/attention-transformers",
    connectedTo: ["rnn-lstm", "deep-learning", "generative-ai"],
  },
  {
    id: "deep-learning",
    label: "Deep Learning",
    short: "Deep Learning",
    tagline: "Learning representations",
    domain: "dl",
    ring: 1,
    angleDeg: -12,
    size: "lg",
    hasRing: true,
    level: "Core",
    route: "/dl-foundations",
    connectedTo: ["neural-networks", "transformers", "rnn-lstm"],
  },
  {
    id: "embeddings",
    label: "Embeddings",
    short: "Embeddings",
    tagline: "Meaning in vector space",
    domain: "intersection",
    ring: 1,
    angleDeg: -132,
    size: "md",
    hasRing: true,
    level: "Core",
    route: "/language-modeling",
    connectedTo: ["semantic-understanding", "language-modeling"],
  },
  {
    id: "language-modeling",
    label: "Language Modeling",
    short: "Language Model",
    tagline: "Predicting the next word",
    domain: "intersection",
    ring: 1,
    angleDeg: 60,
    size: "md",
    hasRing: false,
    level: "Core",
    route: "/language-modeling",
    connectedTo: ["embeddings", "transformers", "generative-ai"],
  },
  {
    id: "generative-ai",
    label: "Generative AI",
    short: "Generative AI",
    tagline: "Creating new content",
    domain: "intersection",
    ring: 1,
    angleDeg: 132,
    size: "md",
    hasRing: false,
    level: "Advanced",
    route: "/attention-transformers",
    connectedTo: ["transformers", "language-modeling"],
  },
  {
    id: "syntax-parsing",
    label: "Syntax & Parsing",
    short: "Syntax",
    tagline: "Understanding structure",
    domain: "nlp",
    ring: 2,
    angleDeg: -144,
    size: "md",
    hasRing: true,
    level: "Core",
    route: "/parsing",
    connectedTo: ["text-preprocessing", "semantic-understanding"],
  },
  {
    id: "semantic-understanding",
    label: "Semantic Understanding",
    short: "Semantics",
    tagline: "Beyond words",
    domain: "nlp",
    ring: 2,
    angleDeg: 90,
    size: "lg",
    hasRing: false,
    level: "Core",
    route: "/semantics",
    connectedTo: ["embeddings", "word-sense"],
  },
  {
    id: "neural-networks",
    label: "Neural Networks",
    short: "Neural Nets",
    tagline: "Learning patterns",
    domain: "dl",
    ring: 2,
    angleDeg: -18,
    size: "md",
    hasRing: false,
    level: "Core",
    route: "/neural-networks",
    connectedTo: ["deep-learning", "rnn-lstm"],
  },
  {
    id: "rnn-lstm",
    label: "RNN / LSTM / GRU",
    short: "RNN / LSTM",
    tagline: "Sequential understanding",
    domain: "dl",
    ring: 2,
    angleDeg: 36,
    size: "md",
    hasRing: true,
    level: "Advanced",
    route: "/rnn-lstm-lab",
    connectedTo: ["neural-networks", "transformers"],
  },
  {
    id: "topic-modeling",
    label: "Topic Modeling",
    short: "Topic Modeling",
    tagline: "Discovering themes",
    domain: "nlp",
    ring: 2,
    angleDeg: 144,
    size: "sm",
    hasRing: true,
    level: "Foundation",
    route: "/nlp-learning-hub",
    connectedTo: ["text-preprocessing", "semantic-understanding"],
  },
  {
    id: "text-preprocessing",
    label: "Text Preprocessing",
    short: "Preprocessing",
    tagline: "Cleaning & preparing text",
    domain: "nlp",
    ring: 3,
    angleDeg: -156,
    size: "sm",
    hasRing: false,
    level: "Foundation",
    route: "/preprocessing",
    connectedTo: ["syntax-parsing", "named-entity-recognition"],
  },
  {
    id: "named-entity-recognition",
    label: "Named Entity Recognition",
    short: "NER",
    tagline: "Finding important entities",
    domain: "nlp",
    ring: 3,
    angleDeg: 168,
    size: "sm",
    hasRing: false,
    level: "Foundation",
    route: "/applications",
    connectedTo: ["text-preprocessing", "sentiment-analysis"],
  },
  {
    id: "sentiment-analysis",
    label: "Sentiment Analysis",
    short: "Sentiment",
    tagline: "Understanding intentions",
    domain: "nlp",
    ring: 3,
    angleDeg: 132,
    size: "sm",
    hasRing: false,
    level: "Foundation",
    route: "/applications",
    connectedTo: ["named-entity-recognition", "semantic-understanding"],
  },
  {
    id: "word-sense",
    label: "Word Sense Disambiguation",
    short: "Word Sense",
    tagline: "Finding the right meaning",
    domain: "nlp",
    ring: 3,
    angleDeg: 108,
    size: "sm",
    hasRing: false,
    level: "Core",
    route: "/semantics",
    connectedTo: ["semantic-understanding", "topic-modeling"],
  },
  {
    id: "computer-vision",
    label: "Computer Vision",
    short: "Computer Vision",
    tagline: "Seeing the world",
    domain: "dl",
    ring: 3,
    angleDeg: 18,
    size: "sm",
    hasRing: false,
    level: "Foundation",
    route: "/dl-foundations",
    connectedTo: ["deep-learning", "neural-networks"],
  },
];
