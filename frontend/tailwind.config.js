/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NLP Nexus design tokens. Each value is a Tailwind CSS-variable
        // color function, NOT a literal hex — the actual R/G/B numbers live
        // in src/index.css as "--nexus-<name>: r g b" under :root (dark,
        // the default) and :root[data-theme="light"] (light). This is what
        // makes every `bg-nexus-*` / `text-nexus-*` / `border-nexus-*` class
        // already used across the app theme-reactive for free: switching
        // the `data-theme` attribute on <html> re-resolves these at paint
        // time, no rebuild, no per-component change, no page reload.
        // The "<alpha-value>" placeholder is filled in by Tailwind when a
        // class uses an opacity modifier (e.g. bg-nexus-accent/10), so
        // every existing /NN usage keeps working unchanged.
        //
        // bg/surfaceAlt/surface/card form the depth scale (page → panel →
        // card → elevated card); purple is reserved for Semantic Lab
        // accents; yellow/gold are accents only, never a base surface or a
        // primary interactive color (blue stays primary in both themes).
        // `ink` is intentionally NOT theme-reactive (same value in both
        // themes) — it's for text that sits on a bright solid/gradient
        // chip (e.g. a yellow badge) and must always read as dark text,
        // regardless of which theme is active.
        nexus: {
          bg: "rgb(var(--nexus-bg) / <alpha-value>)",
          surface: "rgb(var(--nexus-surface) / <alpha-value>)",
          surfaceAlt: "rgb(var(--nexus-surfaceAlt) / <alpha-value>)",
          card: "rgb(var(--nexus-card) / <alpha-value>)",
          surfaceHover: "rgb(var(--nexus-surfaceHover) / <alpha-value>)",
          border: "rgb(var(--nexus-border) / <alpha-value>)",
          text: "rgb(var(--nexus-text) / <alpha-value>)",
          muted: "rgb(var(--nexus-muted) / <alpha-value>)",
          faint: "rgb(var(--nexus-faint) / <alpha-value>)",
          accent: "rgb(var(--nexus-accent) / <alpha-value>)",
          accentDim: "rgb(var(--nexus-accentDim) / <alpha-value>)",
          purple: "rgb(var(--nexus-purple) / <alpha-value>)",
          data: "rgb(var(--nexus-data) / <alpha-value>)",
          good: "rgb(var(--nexus-good) / <alpha-value>)",
          warn: "rgb(var(--nexus-warn) / <alpha-value>)",
          bad: "rgb(var(--nexus-bad) / <alpha-value>)",
          yellow: "rgb(var(--nexus-yellow) / <alpha-value>)",
          gold: "rgb(var(--nexus-gold) / <alpha-value>)",
          coral: "rgb(var(--nexus-coral) / <alpha-value>)",
          posNominal: "rgb(var(--nexus-posNominal) / <alpha-value>)",
          posPredicate: "rgb(var(--nexus-posPredicate) / <alpha-value>)",
          posFunction: "rgb(var(--nexus-posFunction) / <alpha-value>)",
          plannerLavender: "rgb(var(--nexus-plannerLavender) / <alpha-value>)",
          plannerSky: "rgb(var(--nexus-plannerSky) / <alpha-value>)",
          plannerMint: "rgb(var(--nexus-plannerMint) / <alpha-value>)",
          plannerCoral: "rgb(var(--nexus-plannerCoral) / <alpha-value>)",
          plannerButter: "rgb(var(--nexus-plannerButter) / <alpha-value>)",
          plannerRose: "rgb(var(--nexus-plannerRose) / <alpha-value>)",
          ink: "rgb(var(--nexus-ink) / <alpha-value>)",
          onGradient: "rgb(var(--nexus-onGradient) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        // Also var-driven: --nexus-glowAlpha is lower in light mode so the
        // glow reads as a soft highlight instead of the dark-mode neon glow.
        glow: "0 0 40px -10px rgb(var(--nexus-accent) / var(--nexus-glowAlpha))",
      },
    },
  },
  plugins: [],
};
