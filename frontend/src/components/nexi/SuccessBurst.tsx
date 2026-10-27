import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import NexiMascot from "./NexiMascot";

const CONFETTI_COLORS = ["var(--nexus-accent)", "var(--nexus-data)", "var(--nexus-gold)", "var(--nexus-coral)"];

interface Props {
  active: boolean;
  message: string;
  className?: string;
}

/**
 * A short (~1.5s), reusable celebration: NEXI + a message + a small burst
 * of confetti dots — for completing a lesson, quiz, lab, or challenge (spec
 * #28). Parents control `active` (set true briefly, e.g. via a timeout or
 * on a real success response) rather than this component managing its own
 * lifecycle, so it never lingers or fires on its own.
 */
export default function SuccessBurst({ active, message, className }: Props) {
  const reduceMotion = useReducedMotion();
  const confetti = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 90,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.15,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    // Regenerate only when a new celebration actually starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`relative inline-flex items-center gap-2 ${className ?? ""}`}
        >
          <div className="relative">
            <NexiMascot mood="success" size="sm" />
            {!reduceMotion &&
              confetti.map((c) => (
                <motion.span
                  key={c.id}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-sm"
                  style={{ backgroundColor: `rgb(${c.color})` }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: c.x, y: -30 - Math.random() * 20, opacity: 0, rotate: c.rotate }}
                  transition={{ duration: 0.9, delay: c.delay, ease: "easeOut" }}
                />
              ))}
          </div>
          <span className="text-sm font-medium text-nexus-text">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
