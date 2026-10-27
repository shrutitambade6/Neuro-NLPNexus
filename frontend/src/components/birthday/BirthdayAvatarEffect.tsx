import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { BIRTHDAY_RING_GLOW_SHADOW } from "./birthdayTheme";

// Point 8: "avatar can have an animated glowing ring/sparkle effect... but
// NEVER permanently alter the profile picture." Wraps whatever avatar
// element is already rendered (the circular initial/icon badges this app
// uses in Profile.tsx / Messages.tsx / UserMenu) rather than replacing it
// with a new avatar component — the glow is a pure CSS/motion overlay,
// never baked into the avatar image itself, so it genuinely disappears
// with zero residue the moment isBirthdayToday goes false.
export default function BirthdayAvatarEffect({
  active,
  size = 56,
  children,
}: {
  active: boolean;
  size?: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (!active) return <>{children}</>;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {!reduceMotion && (
        <motion.span
          aria-hidden
          className="absolute inset-[-6px] rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgb(var(--nexus-gold)), rgb(var(--nexus-purple)), rgb(var(--nexus-accent)), rgb(var(--nexus-coral)), rgb(var(--nexus-gold)))",
            filter: "blur(3px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div
        className="relative rounded-full"
        style={{ width: size, height: size, boxShadow: BIRTHDAY_RING_GLOW_SHADOW }}
      >
        {children}
      </div>
      <span
        aria-hidden
        className="absolute -top-1 -right-1 text-xs select-none"
        title="Birthday Mode"
      >
        🎂
      </span>
    </div>
  );
}
