import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

import NexiMascot from "./NexiMascot";

const CONFETTI_COLORS = ["var(--nexus-accent)", "var(--nexus-data)", "var(--nexus-gold)", "var(--nexus-coral)"];

interface Props {
  active: boolean;
  message: string;
}

/**
 * The post-registration success toast (spec: "Show an attractive in-app
 * success animation/toast after registration, such as '🎉 Account created
 * successfully! Check your email to verify your account.'"). A fixed,
 * top-of-viewport card — distinct from SuccessBurst (which is an inline
 * celebration for finishing a lesson/quiz) because this needs to be
 * visible immediately on a page the user is about to navigate away from.
 * Parent controls `active` and clears it after a timeout; this component
 * has no dismiss logic of its own.
 */
export default function AccountCreatedToast({ active, message }: Props) {
  const reduceMotion = useReducedMotion();
  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 160,
        rotate: Math.random() * 360,
        delay: Math.random() * 0.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active]
  );

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,420px)]"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-visible rounded-2xl border border-nexus-good/40 bg-nexus-surface shadow-xl px-4 py-3.5 flex items-start gap-3">
            <div className="relative shrink-0">
              <NexiMascot mood="success" size="md" />
              {!reduceMotion &&
                confetti.map((c) => (
                  <motion.span
                    key={c.id}
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-sm pointer-events-none"
                    style={{ backgroundColor: `rgb(${c.color})` }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: c.x, y: -40 - Math.random() * 30, opacity: 0, rotate: c.rotate }}
                    transition={{ duration: 1.1, delay: c.delay, ease: "easeOut" }}
                  />
                ))}
            </div>
            <p className="text-sm font-medium text-nexus-text leading-snug pt-1">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
