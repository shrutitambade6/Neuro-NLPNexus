// NEXUS LIBRARY — the combined shelf, holding BOTH course books at once
// (user request, 2026-10-07): "we have created 2 sections of nlp and dl
// book separately so i want a library where the shelf will be having the
// same ui ... just books will be add on both book on 1 shelf with
// creative library." Confirmed via AskUserQuestion: the two separate
// sidebar entries ("NLP Digital Book" / "Deep Learning Digital Book")
// are REPLACED by one "Digital Library" entry that opens this page.
//
// This is deliberately the same shelf UI as the original single-book
// Bookshelf.tsx (same panel, same FillerSpine/ShelfSpine pieces, same
// shelf -> reading handoff motion into InteractiveBook) -- nothing about
// how a spine looks, hovers, or hands off to reading changed. The only
// difference is that this shelf renders TWO real ShelfSpines (one per
// book, reusing that component completely unchanged -- it was always
// theme-driven, never hardcoded to one book) instead of one, plus a
// small divider between them and a two-tone ambient glow (purple +
// gold, one per domain) instead of one theme's single glow.
//
// Bookshelf.tsx itself is untouched and still exists -- see
// NlpBook.tsx/DlBook.tsx, which now redirect their own no-?chapter=
// shelf view here rather than rendering their own single-book shelf, so
// there's only ever one "browse the library" experience. The `?chapter=`
// deep-link contract those two pages serve is completely unaffected by
// any of this -- it still renders <InteractiveBook> directly, skipping
// this shelf entirely, exactly as before.
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import InteractiveBook from "../book/InteractiveBook";
import FillerSpine from "./FillerSpine";
import ShelfSpine from "./ShelfSpine";
import { DURATION, EASE_STANDARD } from "../../motion/tokens";
import { DL_BOOK, NLP_BOOK } from "../../utils/bookCatalog";
import type { BookTheme } from "../../utils/bookCatalog";

type Phase = "shelf" | "reading";

export default function CombinedBookshelf() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("shelf");
  // Which book is open during the "reading" phase. Defaults to the NLP
  // book, but this value is only ever read once `phase` is "reading" --
  // openBook() always sets both together, so it's never stale.
  const [activeTheme, setActiveTheme] = useState<BookTheme>(NLP_BOOK);

  const openBook = (theme: BookTheme) => {
    setActiveTheme(theme);
    setPhase("reading");
  };

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
              <h1 className="mt-1 text-xl font-semibold text-nexus-text">
                Natural Language Processing <span className="text-nexus-muted">&amp;</span> Deep Learning
              </h1>
            </div>

            {/* The shelf itself: same stylized academic panel as the
                original single-book shelf, just with two ambient glows
                (one per domain) instead of one, and two real spines on
                it instead of one. Stylized, not photorealistic. */}
            <div
              // pt-14 (was pt-10) 2026-10-07 -- the real spines grew taller
              // (see ShelfSpine.tsx) to stop clipping their own titles, so
              // the panel needs a little more headroom above them too.
              className="relative rounded-2xl border border-nexus-border px-6 pb-5 pt-14 sm:px-10"
              style={{
                background: "linear-gradient(180deg, rgb(var(--nexus-surface)) 0%, rgb(var(--nexus-surfaceAlt)) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 30px 60px -30px rgba(0,0,0,0.6)",
              }}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[30%] top-0 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: `rgb(var(--nexus-${NLP_BOOK.primary}))` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[70%] top-0 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
                style={{ background: `rgb(var(--nexus-${DL_BOOK.primary}))` }}
              />

              {/* Filler heights bumped 2026-10-07 (same ratio to each other as
                  before) to stay in visual proportion now that the real
                  ShelfSpines grew from 210 to 252 tall -- see that
                  component's own comment for why.
                  pb-2 -> pb-9 (also 2026-10-07, same report): this row has
                  overflow-x-auto for small-screen scrolling, which per the
                  CSS overflow spec forces its overflow-y to behave as
                  "auto" too (a scroll/clip container), not "visible" --
                  so ShelfSpine's hover-reveal title, which sits BELOW each
                  spine via `absolute -bottom-6`, was getting silently
                  clipped by this row's own bottom edge instead of showing
                  in full. The extra bottom padding here gives that
                  overflowing title room to live inside the row's own box
                  instead of past it, so it renders uncut. */}
              <div className="flex items-end justify-center overflow-x-auto px-2 pb-9">
                <FillerSpine height={178} width={22} tone="a" />
                <FillerSpine height={198} width={20} tone="b" />
                <ShelfSpine theme={NLP_BOOK} onActivate={() => openBook(NLP_BOOK)} />
                <FillerSpine height={188} width={20} tone="c" />

                {/* A small divider between the two books' clusters --
                    echoing the hero solar system's own "NLP x DL" core
                    label, so this new page reads as part of the same
                    visual language rather than inventing a new motif. */}
                <div
                  aria-hidden="true"
                  className="mx-2 mb-10 flex h-10 w-6 flex-shrink-0 items-center justify-center self-end text-xs font-semibold text-nexus-muted"
                >
                  &times;
                </div>

                <FillerSpine height={188} width={20} tone="c" />
                <ShelfSpine theme={DL_BOOK} onActivate={() => openBook(DL_BOOK)} />
                <FillerSpine height={198} width={20} tone="b" />
                <FillerSpine height={178} width={22} tone="a" />
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
              Pull {NLP_BOOK.title} or {DL_BOOK.title} from the shelf to start reading.
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
            <InteractiveBook theme={activeTheme} autoOpen onClosed={() => setPhase("shelf")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
