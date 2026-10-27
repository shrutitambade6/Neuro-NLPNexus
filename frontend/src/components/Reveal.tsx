import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * A small, reusable scroll-reveal wrapper — fades a section in and nudges
 * it up slightly the first time it enters the viewport, using Framer's
 * `whileInView` (IntersectionObserver under the hood, so this never hijacks
 * or interferes with the browser's own scrolling). `viewport={{ once: true }}`
 * means each section reveals a single time, not on every scroll past it.
 * Respects prefers-reduced-motion: renders already-visible with no motion.
 */
export default function Reveal({ children, delay = 0, className }: Props) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
