// Shared visual constants for the Interactive Learning Books' paper.
// Deliberately fixed hex values, NOT the theme-reactive nexus-* tokens —
// per the feature spec, the warm paper palette stays identical in both the
// dark and light site themes on purpose. The contrast between the
// futuristic app shell (which does re-theme) and a warm, physical-paper
// book (which doesn't) is intentional, not an oversight.
export const PAPER_BG = "#F7F3EA";
export const PAPER_BG_SOFT = "#FBF8F1";
export const PAPER_EDGE = "#E7DEC8";
export const PAPER_SPINE_SHADOW = "rgba(64, 48, 24, 0.24)";
export const PAPER_INK = "#2B2620";
export const PAPER_INK_SOFT = "#6E6554";

// A barely-visible paper grain, built once as an inline SVG data URI so the
// texture needs no image asset and no new dependency — a single
// feTurbulence noise field rendered at very low alpha over the paper
// background. Point 10 of the spec asks for this to be "barely
// noticeable," so the baked-in alpha (0.05) is deliberately low.
export const PAPER_GRAIN_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
      "<filter id='n'>" +
      "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/>" +
      "</filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/>" +
      "</svg>",
  );

// Fixed (not Math.random()) jitter for the page-stack edge lines — a few
// hand-picked offsets so the stack reads as physical paper rather than a
// perfectly uniform, obviously-fake ruler pattern, without risking a
// different value on every re-render.
export const PAGE_EDGE_JITTER = [0, 1, 0.5, 1.5, 0, 1, 0.5, 0, 1.5, 0.5, 1, 0];
