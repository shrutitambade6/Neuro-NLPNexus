import { motion, useReducedMotion } from "framer-motion";

import { BIRTHDAY_BADGE_CLASSES } from "./birthdayTheme";

// Point 14: "a temporary visual badge... NOT automatically a permanent
// achievement badge unless the existing badge system specifically
// supports it." This deliberately does NOT touch utils/badgeCatalog.ts
// or the real achievement-badge system — it's just a small, honest,
// temporary identity indicator that exists only while isBirthdayToday is
// true (see useBirthday()), same as the rest of this feature.
export default function BirthdayBadge({ variant = "mode" }: { variant?: "mode" | "star" }) {
  const reduceMotion = useReducedMotion();
  const label = variant === "star" ? "Birthday Star" : "Birthday Mode";

  return (
    <motion.span
      className={BIRTHDAY_BADGE_CLASSES}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        aria-hidden
        animate={reduceMotion ? undefined : { rotate: [0, -10, 10, 0] }}
        transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, repeatDelay: 2 }}
      >
        🎂
      </motion.span>
      {label}
    </motion.span>
  );
}
