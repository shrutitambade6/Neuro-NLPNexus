// A reusable "chapter" wrapper for Behind the Nexus's storytelling
// sub-sections (spec sections 11-13: "What Inspired This Platform,"
// "Knowledge is never built alone," the final ending) — fades/settles
// in once scrolled into view rather than all at once on page load,
// matching the rest of this pass's "avoid everything appearing
// simultaneously" convention (motion/primitives.tsx's own
// StaggerContainer doc comment), without adding a new shared primitive
// for a one-page feature. Degrades to a plain, static render under
// prefers-reduced-motion (spec section 18).
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_STANDARD } from "../../motion/tokens";

export default function StorySection({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: DURATION.scene, ease: EASE_STANDARD }}
    >
      {children}
    </motion.div>
  );
}
