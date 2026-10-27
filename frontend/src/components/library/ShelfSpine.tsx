// The one INTERACTIVE spine on the library shelf — the real book the
// student is about to pull out. See FillerSpine.tsx for the purely
// decorative neighbors that give the shelf some visual weight without
// competing for attention (section 2: "use accents selectively").
//
// Motion here is deliberately small (section 8: "do NOT make it rotate
// 360 degrees — keep movement subtle"): a few px of lift, a couple degrees
// of tilt, a soft accent glow, and the title fading in underneath. Reuses
// the exact same theme.spineLines / theme.primary data InteractiveBook's
// own BookSpine.tsx already renders on the closed-book composite, so the
// label on the shelf and the label on the book itself always agree.
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_SNAPPY } from "../../motion/tokens";
import { nexusVar } from "../../utils/theme";
import type { BookTheme } from "../../utils/bookCatalog";

interface Props {
  theme: BookTheme;
  onActivate: () => void;
}

export default function ShelfSpine({ theme, onActivate }: Props) {
  const reduceMotion = useReducedMotion();
  const isNlp = theme.id === "nlp";
  const [active, setActive] = useState(false);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Pull ${theme.title} from the shelf`}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate();
        }
      }}
      onHoverStart={() => setActive(true)}
      onHoverEnd={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      className="relative mx-1.5 flex cursor-pointer flex-col items-center outline-none"
      // Enlarged 2026-10-07 (user report: the vertical spine title was
      // getting clipped top/bottom by this box's own overflow-hidden --
      // "NEURO NLP NEXUS" at 9px/16 characters was taller than the old
      // 210px box). See the text span below for the matching
      // letter-spacing reduction -- both changes together give the
      // longest spine title (16 characters) comfortable headroom.
      style={{ width: 80, height: 252 }}
      initial={false}
      animate={
        reduceMotion
          ? undefined
          : active
          ? {
              y: -10,
              rotate: isNlp ? -3 : 3,
              scale: 1.045,
              boxShadow: `0 18px 30px -10px rgb(var(--nexus-${theme.primary}) / 0.55)`,
            }
          : { y: 0, rotate: 0, scale: 1, boxShadow: "0 0px 0px rgba(0,0,0,0)" }
      }
      whileTap={reduceMotion ? undefined : { scale: 1.01 }}
      transition={{ duration: DURATION.hover, ease: EASE_SNAPPY }}
    >
      {/* The spine itself */}
      <div
        className="relative h-full w-full overflow-hidden rounded-t-sm rounded-b-[2px]"
        style={{
          background: `linear-gradient(180deg, ${nexusVar(theme.primary, 0.95)}, ${nexusVar(theme.primary, 0.7)})`,
          boxShadow: "inset 2px 0 0 rgba(255,255,255,0.18), inset -2px 0 10px rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.45)",
        }}
      >
        {/* Domain-flavored, very faint decorative marks — tiny token/node
            glyphs (section 12/13), never more than a handful, never the
            focal point. */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.16]"
          viewBox="0 0 80 252"
          aria-hidden="true"
        >
          {/* Coordinates rescaled 2026-10-07 for the enlarged 80x252 spine
              (previously 64x210) -- same relative positions, just scaled
              by the same 1.25x/1.2x the box itself grew by. */}
          {isNlp ? (
            <>
              <text x="40" y="58" textAnchor="middle" fontSize="11" fill="white" fontFamily="monospace">[NP]</text>
              <text x="40" y="180" textAnchor="middle" fontSize="11" fill="white" fontFamily="monospace">S{String.fromCharCode(8594)}VP</text>
              <circle cx="25" cy="114" r="2" fill="white" />
              <circle cx="55" cy="126" r="2" fill="white" />
              <line x1="25" y1="114" x2="55" y2="126" stroke="white" strokeWidth="0.75" />
            </>
          ) : (
            <>
              <circle cx="28" cy="60" r="3" fill="white" />
              <circle cx="53" cy="72" r="3" fill="white" />
              <circle cx="28" cy="180" r="3" fill="white" />
              <circle cx="53" cy="192" r="3" fill="white" />
              <line x1="28" y1="60" x2="53" y2="72" stroke="white" strokeWidth="0.75" />
              <line x1="28" y1="180" x2="53" y2="192" stroke="white" strokeWidth="0.75" />
              <line x1="28" y1="60" x2="28" y2="180" stroke="white" strokeWidth="0.5" />
            </>
          )}
        </svg>

        <div className="flex h-full w-full items-center justify-center">
          <span
            className="whitespace-pre-line text-center text-[9px] font-semibold uppercase leading-[2.1] tracking-[0.12em]"
            style={{ writingMode: "vertical-rl", color: nexusVar("onGradient") }}
          >
            {`${theme.spineLines[0]}\n${theme.spineLines[1]}`}
          </span>
        </div>
      </div>

      {/* Shelf-contact shadow */}
      <div aria-hidden="true" className="mt-1 h-2 w-12 rounded-full bg-black/50 blur-sm" />

      {/* Title reveal on hover/focus (section 8, point 5) */}
      <motion.span
        className="pointer-events-none absolute -bottom-6 whitespace-nowrap text-[11px] font-medium text-nexus-text"
        animate={reduceMotion ? { opacity: active ? 1 : 0 } : { opacity: active ? 1 : 0, y: active ? 0 : -4 }}
        transition={{ duration: DURATION.micro }}
      >
        {theme.title}
      </motion.span>
    </motion.div>
  );
}
