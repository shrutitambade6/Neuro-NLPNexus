import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

import NexiMascot from "../nexi/NexiMascot";
import { useBirthday } from "../../hooks/useBirthday";
import { BIRTHDAY_GRADIENT_TEXT, BIRTHDAY_PANEL_CLASSES } from "./birthdayTheme";

// Point 7: the personal greeting shown on login/first dashboard visit on
// the user's birthday. Mounted once, globally, in StudentLayout.tsx —
// shows itself based purely on useBirthday() state, so it appears
// wherever the signed-in student happens to land first, not just one
// specific page. Dismissing it (X, or Escape via the backdrop) never
// turns birthday mode off — it only hides this one overlay, exactly like
// closing a toast; isBirthdayToday keeps being computed live from the
// user's real birthday (point 5).
export default function BirthdayGreeting() {
  const { isBirthdayToday, birthdayUser, loaded, greetingDismissed, dismissGreeting, celebrate } = useBirthday();
  const reduceMotion = useReducedMotion();

  const show = loaded && isBirthdayToday && !greetingDismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-nexus-ink/70 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.25 }}
          onClick={dismissGreeting}
          role="dialog"
          aria-modal="true"
          aria-label="Happy birthday"
        >
          <motion.div
            className={`relative w-full max-w-sm p-6 text-center shadow-2xl ${BIRTHDAY_PANEL_CLASSES}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 12 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: reduceMotion ? 0.05 : 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismissGreeting}
              className="absolute top-3 right-3 text-nexus-muted hover:text-nexus-text transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="flex justify-center mb-3">
              <NexiMascot mood="success" size="lg" />
            </div>

            <p className={`text-xl font-display font-semibold ${BIRTHDAY_GRADIENT_TEXT}`}>
              🎂 Happy Birthday{birthdayUser ? `, ${birthdayUser}` : ""}!
            </p>
            <p className="mt-2 text-sm text-nexus-text">Today, NeuroNLP Nexus is celebrating YOU.</p>
            <p className="mt-1 text-xs text-nexus-muted">
              Your learning journey deserves a little celebration too.
            </p>

            <button
              onClick={celebrate}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-nexus-purple via-nexus-accent to-nexus-gold px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Let's celebrate →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
