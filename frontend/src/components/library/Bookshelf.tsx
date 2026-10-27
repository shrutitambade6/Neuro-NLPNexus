// NEXUS LIBRARY — the shelf-to-reader experience (motion-first UI pass,
// 2026-10-06, sections 7-11 of the spec). Reuses the existing
// InteractiveBook engine completely unchanged in its page-turning logic —
// this component only adds what happens BEFORE a student starts reading:
// a shelf scene they pull the real book out of, and the reverse when they
// close it. See InteractiveBook.tsx's `autoOpen`/`onClosed` props (added
// for this pass) for how the two components hand off to each other.
//
// Deliberately NOT used when a `?chapter=` deep link is present — see
// NlpBook.tsx/DlBook.tsx, which render <InteractiveBook> directly in that
// case so a "Read this concept" link from a lab page still jumps straight
// to the exact page it always did, with no shelf ceremony in the way.
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import InteractiveBook from "../book/InteractiveBook";
import FillerSpine from "./FillerSpine";
import ShelfSpine from "./ShelfSpine";
import { DURATION, EASE_STANDARD } from "../../motion/tokens";
import type { BookTheme } from "../../utils/bookCatalog";

interface Props {
  theme: BookTheme;
}

type Phase = "shelf" | "reading";

export default function Bookshelf({ theme }: Props) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("shelf");

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center gap-2 py-6">
      <AnimatePresence mode="wait">
        {phase === "shelf" ? (
          <motion.div
            key="shelf"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0.2, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0.15 : DURATION.panel, ease: EASE_STANDARD }}
            className="flex flex-col items-center gap-4"
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-nexus-muted">Nexus Library</p>
              <h1 className="mt-1 text-xl font-semibold text-nexus-text">{theme.kicker}</h1>
            </div>

            {/* The shelf itself: a stylized academic panel with a ledge,
                a handful of decorative filler spines, and the one real,
                interactive book. Stylized, not photorealistic (section 7). */}
            <div
              className="relative rounded-2xl border border-nexus-border px-6 pb-5 pt-10 sm:px-10"
              style={{
                background: "linear-gradient(180deg, rgb(var(--nexus-surface)) 0%, rgb(var(--nexus-surfaceAlt)) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -30px rgba(0,0,0,0.6)",
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 h-24 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: `rgb(var(--nexus-${theme.primary}))` }}
              />

              {/* pb-9 (was pb-2), 2026-10-07 -- same fix as
                  CombinedBookshelf.tsx: this row's overflow-x-auto forces
                  overflow-y to clip too, which was cutting off ShelfSpine's
                  absolutely-positioned hover-reveal title. Kept in sync even
                  though this component is currently unused (see its own
                  top-of-file history note) in case it's ever reused. */}
              <div className="flex items-end justify-center overflow-x-auto px-2 pb-9">
                <FillerSpine height={150} width={26} tone="a" />
                <FillerSpine height={172} width={22} tone="b" />
                <FillerSpine height={158} width={30} tone="c" />
                <ShelfSpine theme={theme} onActivate={() => setPhase("reading")} />
                <FillerSpine height={166} width={24} tone="b" />
                <FillerSpine height={148} width={28} tone="a" />
                <FillerSpine height={176} width={20} tone="c" />
              </div>

              <div
                className="relative mt-3 h-3 rounded-sm"
                style={{
                  background: "linear-gradient(180deg, rgb(var(--nexus-border)), rgb(var(--nexus-bg)))",
                  boxShadow: "0 8px 16px -4px rgba(0,0,0,0.5)",
                }}
              />
            </div>

            <p className="max-w-sm text-center text-[11px] text-nexus-muted">
              Pull {theme.title} from the shelf to start reading.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reading"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.4, y: 70 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: reduceMotion ? 0.15 : DURATION.physical, ease: EASE_STANDARD }}
            className="flex w-full flex-col items-center"
          >
            <InteractiveBook theme={theme} autoOpen onClosed={() => setPhase("shelf")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
