// Centralized motion vocabulary (motion-first UI pass, 2026-10-06) — one
// place for every duration/easing/distance value so Library, Dashboard,
// Concept DNA, Playground, etc. share a single consistent feel instead of
// each page inventing its own numbers. See motion/primitives.tsx for the
// reusable components built on top of these.
//
// Timing bands match the spec's own table:
//   micro interaction   150-250ms   hover               200-350ms
//   panel transition    350-550ms   major scene change  600-1000ms
//   physical object     700-1200ms  (book extraction, etc.)
export const DURATION = {
  micro: 0.2,
  hover: 0.25,
  panel: 0.45,
  scene: 0.8,
  physical: 0.9,
} as const;

// The same cubic-bezier InteractiveBook.tsx already uses for its cover/page
// motion — reused here rather than inventing a second "house" curve, so a
// book's open/close and a new panel's slide-in feel like one material.
export const EASE_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];
// A touch snappier — for hovers / micro-interactions, not scene changes.
export const EASE_SNAPPY: [number, number, number, number] = [0.33, 1, 0.68, 1];

export const DISTANCE = {
  micro: 3, // HoverLift / button elevation
  slide: 16, // FadeIn's default y-offset
  slideLg: 32,
} as const;

export const SCALE = {
  tap: 0.97,
  hoverLift: 1.02,
  enterFrom: 0.96,
} as const;

// Stagger gap between siblings in a StaggerContainer — deliberately small;
// section 20's "avoid everything appearing simultaneously" is about ORDER,
// not about the user visibly waiting for a slow cascade.
export const STAGGER_GAP = 0.06;
