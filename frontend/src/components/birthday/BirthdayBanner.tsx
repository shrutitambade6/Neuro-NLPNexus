import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import { useBirthday } from "../../hooks/useBirthday";
import { BIRTHDAY_PANEL_CLASSES } from "./birthdayTheme";

// Point 9: the Dashboard banner. "Dismissible for the session, but
// birthday mode itself stays active" — dismissing only hides this one
// card (bannerDismissed, separate from greetingDismissed/isBirthdayToday)
// and never affects the celebration layer, badge, or avatar ring
// elsewhere in the app.
export default function BirthdayBanner() {
  const { isBirthdayToday, loaded, bannerDismissed, dismissBanner, celebrate } = useBirthday();
  const reduceMotion = useReducedMotion();

  const show = loaded && isBirthdayToday && !bannerDismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0.05 : 0.25 }}
          className={`relative overflow-hidden p-5 ${BIRTHDAY_PANEL_CLASSES}`}
        >
          <button
            onClick={dismissBanner}
            className="absolute top-3 right-3 text-nexus-muted hover:text-nexus-text transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
          <p className="text-sm font-display font-semibold flex items-center gap-1.5">
            🎂 HAPPY BIRTHDAY!
          </p>
          <p className="mt-1 text-sm text-nexus-text">
            NeuroNLP Nexus has something special for you today.
          </p>
          <p className="text-xs text-nexus-muted mt-0.5">Your learning space is celebrating with you.</p>
          <button
            onClick={celebrate}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-nexus-gold hover:underline"
          >
            <Sparkles size={14} /> See birthday wishes →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
