import { useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

import { STORY_PHASES, getStoryPhaseForPath } from "../../utils/storyJourney";

// Section 16 of the storytelling spec (2026-10-07): "a subtle storytelling
// progress indicator... small connected nodes / orbital points... should
// not occupy much screen space... NOT a boring website progress bar."
// Mounted once in StudentLayout.tsx so it travels with every protected
// page; renders nothing at all (not even a placeholder) on a page with no
// mapped story phase (see storyJourney.ts) — this is deliberately a thin,
// quiet strip, not a persistent chrome element every page must account
// for.
export default function StoryProgressIndicator() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const current = getStoryPhaseForPath(location.pathname);

  if (!current) return null;

  const currentIndex = STORY_PHASES.findIndex((p) => p.key === current);

  return (
    <div
      aria-label={`Your journey: ${STORY_PHASES[currentIndex]?.label}`}
      className="flex items-center justify-center gap-1.5 py-1.5 select-none"
    >
      {STORY_PHASES.map((phase, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;
        return (
          <div key={phase.key} className="flex items-center gap-1.5">
            <div className="group relative flex items-center justify-center">
              <motion.span
                className="block rounded-full"
                style={{
                  width: isCurrent ? 7 : 5,
                  height: isCurrent ? 7 : 5,
                  background: isCurrent
                    ? "rgb(var(--nexus-accent))"
                    : isPast
                      ? "rgb(var(--nexus-accent) / 0.45)"
                      : "rgb(var(--nexus-muted) / 0.35)",
                  boxShadow: isCurrent ? "0 0 8px rgb(var(--nexus-accent) / 0.7)" : "none",
                }}
                animate={
                  isCurrent && !reduceMotion
                    ? { opacity: [0.75, 1, 0.75] }
                    : { opacity: 1 }
                }
                transition={
                  isCurrent && !reduceMotion
                    ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
                }
              />
              {/* Label only on hover/focus -- keeps the strip itself tiny. */}
              <span
                className="pointer-events-none absolute top-full mt-1 hidden whitespace-nowrap rounded border border-nexus-border bg-nexus-surface px-1.5 py-0.5 text-[9px] font-medium text-nexus-muted group-hover:block"
              >
                {phase.label}
              </span>
            </div>
            {i < STORY_PHASES.length - 1 && (
              <span
                className="block h-px w-4"
                style={{ background: isPast ? "rgb(var(--nexus-accent) / 0.4)" : "rgb(var(--nexus-border))" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
