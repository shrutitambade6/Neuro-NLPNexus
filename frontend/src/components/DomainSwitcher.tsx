import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

import { useDomainStore } from "../store/domainStore";

// The prominent NLP / Deep Learning toggle called for in the NeuroNLP Nexus
// spec. It's real (it persists a real choice, per-browser) — see
// store/domainStore.ts. Color language: purple/magenta for NLP, gold
// (the orange half of the platform's "orange/coral" Deep Learning accent)
// for Deep Learning — the same two-domain system used on the Dashboard's
// domain-choice cards (components/DomainChoiceCards.tsx), progress bars,
// and badges everywhere else in the app. The app's own primary color stays
// blue (nexus-accent) throughout — it's not reused as "the NLP color"
// anymore. This file only owns the interaction/animation layer on top of
// the real domain state: a sliding highlight (mirrors ThemeToggle.tsx's
// pattern), a color-coded hover glow, and a brief radial pulse the moment
// the domain actually changes, in that domain's color.
export default function DomainSwitcher() {
  const domain = useDomainStore((s) => s.domain);
  const setDomain = useDomainStore((s) => s.setDomain);
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="group"
      aria-label="Domain"
      className="relative flex items-center gap-0.5 rounded-lg border border-nexus-border bg-nexus-surface p-0.5 text-xs font-medium shrink-0"
    >
      <button
        onClick={() => setDomain("nlp")}
        aria-pressed={domain === "nlp"}
        className="group relative flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:shadow-[0_0_10px_rgb(var(--nexus-purple)/0.3)]"
      >
        {domain === "nlp" && (
          <motion.span
            layoutId="domain-switcher-active"
            className="absolute inset-0 rounded-md bg-nexus-purple/15"
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <span
          className={`relative flex items-center gap-1.5 ${
            domain === "nlp" ? "text-nexus-purple" : "text-nexus-muted group-hover:text-nexus-text"
          }`}
        >
          <span aria-hidden className="inline-block transition-transform group-hover:scale-110">
            🧠
          </span>
          NLP
        </span>
      </button>
      <button
        onClick={() => setDomain("dl")}
        aria-pressed={domain === "dl"}
        className="group relative flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:shadow-[0_0_10px_rgb(var(--nexus-gold)/0.3)]"
      >
        {domain === "dl" && (
          <motion.span
            layoutId="domain-switcher-active"
            className="absolute inset-0 rounded-md bg-nexus-yellow/15"
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
        <span
          className={`relative flex items-center gap-1.5 ${
            domain === "dl" ? "text-nexus-yellow" : "text-nexus-muted group-hover:text-nexus-text"
          }`}
        >
          <span aria-hidden className="inline-block transition-transform group-hover:scale-110">
            ⚡
          </span>
          Deep Learning
        </span>
      </button>

      {/* A one-shot pulse in the newly-active domain's color, replayed each
          time `domain` changes (the AnimatePresence key) — reads as a small
          "data pulse" moving through the control rather than a static swap. */}
      {!reduceMotion && (
        <AnimatePresence>
          <motion.span
            key={domain}
            initial={{ opacity: 0.35, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`pointer-events-none absolute inset-0 rounded-lg ${
              domain === "nlp" ? "bg-nexus-purple/20" : "bg-nexus-yellow/20"
            }`}
          />
        </AnimatePresence>
      )}
    </div>
  );
}
