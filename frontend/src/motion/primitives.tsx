// Reusable motion primitives (motion-first UI pass, 2026-10-06). Built on
// top of framer-motion (already a dependency — see InteractiveBook.tsx,
// the most advanced existing user of it in this codebase) and the shared
// tokens in motion/tokens.ts, so every page that wants "this panel fades
// and slides up" or "this card lifts on hover" reaches for ONE of these
// instead of hand-rolling a new transition object each time.
//
// Every primitive here calls useReducedMotion() itself and degrades to a
// plain, instant (or near-instant) fade — never full motion forced on a
// user who asked their OS not to animate things, per the spec's
// accessibility section. Nothing here depends on application state; data-
// driven animation (a real loading/success/error signal) stays with the
// component that owns that state, per the spec's own "don't fake it" rule.
import { type ReactNode, useRef } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import { DISTANCE, DURATION, EASE_SNAPPY, EASE_STANDARD, SCALE, STAGGER_GAP } from "./tokens";

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}

/** Opacity 0→1 with a small upward slide — the single most common entrance
 * in this system. Use for a panel, a section, a card appearing on its own
 * (not inside a StaggerContainer, which already staggers FadeIns itself). */
export function FadeIn({ children, className, delay = 0, y = DISTANCE.slide, duration = DURATION.panel }: FadeInProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : duration, delay: reduceMotion ? 0 : delay, ease: EASE_STANDARD }}
    >
      {children}
    </motion.div>
  );
}

interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Scale+fade entrance — for a thing that should feel like it's settling
 * into place (a modal, a focused card) rather than sliding in from off-
 * screen. */
export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: SCALE.enterFrom }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.15 : DURATION.panel, delay: reduceMotion ? 0 : delay, ease: EASE_STANDARD }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER_GAP } },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.slide },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.panel, ease: EASE_STANDARD } },
};

const staggerItemVariantsReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

/** Wrap a list of <StaggerItem>s (Dashboard's lab cards, a results list,
 * Concept DNA's related-concept list, etc.) so they reveal one after
 * another instead of popping in all at once — section 6/20/23's "avoid
 * everything appearing simultaneously." */
export function StaggerContainer({ children, className }: StaggerContainerProps) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={staggerContainerVariants}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className} variants={reduceMotion ? staggerItemVariantsReduced : staggerItemVariants}>
      {children}
    </motion.div>
  );
}

interface HoverLiftProps {
  children: ReactNode;
  className?: string;
  lift?: number;
}

/** Card/button hover elevation: translateY + a touch of scale, nothing
 * else — section 20's "card hover: translateY(-3px) + shadow," kept as one
 * shared primitive so every card in the app lifts by the same amount. The
 * shadow itself stays a plain CSS class on the child (hover:shadow-*),
 * since that's cheaper than animating box-shadow through JS. */
export function HoverLift({ children, className, lift = DISTANCE.micro }: HoverLiftProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift, scale: SCALE.hoverLift }}
      whileTap={{ scale: SCALE.tap }}
      transition={{ duration: DURATION.hover, ease: EASE_SNAPPY }}
    >
      {children}
    </motion.div>
  );
}

/** A route/page's outer wrapper — fade + small upward settle on mount.
 * Deliberately short and the same everywhere (section 19: transitions
 * should never make navigation feel slow). Not a router-level transition
 * (no shared layout animation between pages, no exit animation) — just a
 * consistent "this page has arrived" entrance, which is what section 19
 * actually asks for ("slight fade + spatial shift") without the
 * complexity/fragility of animating route unmounts. */
export function PageEnter({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : DURATION.scene * 0.5, ease: EASE_STANDARD }}
    >
      {children}
    </motion.div>
  );
}

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "button" | "div";
  strength?: number;
  ariaLabel?: string;
}

/** A button that very subtly follows the cursor within its own bounds —
 * section 22's cursor interactions, kept intentionally tiny (a few px,
 * clamped) so it reads as "alive" rather than gimmicky. Pointer-only: a
 * touch/coarse-pointer device (checked once, not re-measured per move)
 * gets a plain button with the ordinary tap scale and no follow effect,
 * per the spec's own "disable on touch devices" instruction. */
export function MagneticButton({ children, className, onClick, as = "button", strength = 10, ariaLabel }: MagneticButtonProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isCoarsePointer =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const disableFollow = reduceMotion || isCoarsePointer;

  const Comp = motion.div;
  return (
    <Comp
      ref={ref}
      role={as === "button" ? "button" : undefined}
      tabIndex={as === "button" ? 0 : undefined}
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
      onKeyDown={(e) => {
        if (as === "button" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseMove={(e) => {
        if (disableFollow || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        ref.current.style.setProperty("--magnet-x", `${px * strength}px`);
        ref.current.style.setProperty("--magnet-y", `${py * strength}px`);
      }}
      onMouseLeave={() => {
        ref.current?.style.setProperty("--magnet-x", "0px");
        ref.current?.style.setProperty("--magnet-y", "0px");
      }}
      style={{
        transform: disableFollow ? undefined : "translate(var(--magnet-x, 0px), var(--magnet-y, 0px))",
        transition: disableFollow ? undefined : `transform ${DURATION.hover}s ${EASE_SNAPPY.join(",")}`,
        cursor: as === "button" ? "pointer" : undefined,
        display: "inline-block",
      }}
      whileTap={disableFollow ? undefined : { scale: SCALE.tap }}
    >
      {children}
    </Comp>
  );
}
