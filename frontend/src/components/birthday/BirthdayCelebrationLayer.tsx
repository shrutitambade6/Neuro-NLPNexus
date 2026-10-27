import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Point 6/15: "a subtle celebration layer... soft glowing particles,
// floating stars, neural-network sparkles, animated gradient glow...
// must NOT destroy the existing dark navy/blue/purple-NLP/orange-DL
// design." Mounted once in StudentLayout.tsx, right alongside
// NeuralBackground (same fixed/pointer-events-none/full-viewport
// pattern — see that component), and only rendered at all while
// useBirthday().isBirthdayToday is true. Deliberately NOT a replacement
// for NeuralBackground; it layers on top of it.
//
// Point 27/28: particle count is cut on narrow screens so nothing turns
// into "giant graphics covering content" on a phone, and the whole thing
// collapses to a single static soft glow (no motion, no particles) under
// prefers-reduced-motion — the celebration is communicated by the
// badge/banner text in that case, never by animation alone.
const PARTICLE_COUNT_DESKTOP = 16;
const PARTICLE_COUNT_MOBILE = 7;

interface Particle {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  hue: "gold" | "purple" | "accent" | "coral";
}

function buildParticles(count: number): Particle[] {
  const hues: Particle["hue"][] = ["gold", "purple", "accent", "coral"];
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    // A fixed, seeded-by-index spread rather than Math.random() on every
    // render — this list is built once (useMemo) per mount, so a stable
    // pseudo-random spread from the index is enough to look organic
    // without the particles silently reshuffling on unrelated re-renders.
    const seed = (i * 97) % 100;
    particles.push({
      left: (seed * 1.7) % 100,
      top: (seed * 2.3 + i * 11) % 100,
      size: 3 + (i % 3),
      delay: (i % 5) * 0.6,
      duration: 5 + (i % 4),
      hue: hues[i % hues.length],
    });
  }
  return particles;
}

const HUE_VAR: Record<Particle["hue"], string> = {
  gold: "--nexus-gold",
  purple: "--nexus-purple",
  accent: "--nexus-accent",
  coral: "--nexus-coral",
};

export default function BirthdayCelebrationLayer() {
  const reduceMotion = useReducedMotion();
  const isNarrow = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const particles = useMemo(
    () => buildParticles(isNarrow ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP),
    [isNarrow]
  );

  return (
    <div className="pointer-events-none fixed inset-0 w-full h-full overflow-hidden" style={{ zIndex: 1 }} aria-hidden>
      {/* Soft ambient glow — present even with reduced motion, since a
          static glow is not an animation and reads as "celebrating" on
          its own. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 18% 12%, rgb(var(--nexus-purple) / 0.12), transparent 60%), " +
            "radial-gradient(55% 45% at 85% 20%, rgb(var(--nexus-gold) / 0.10), transparent 60%), " +
            "radial-gradient(50% 40% at 50% 95%, rgb(var(--nexus-coral) / 0.08), transparent 60%)",
        }}
      />

      {!reduceMotion &&
        particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: `rgb(var(${HUE_VAR[p.hue]}))`,
              boxShadow: `0 0 8px rgb(var(${HUE_VAR[p.hue]}) / 0.9)`,
            }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.9, 0], y: -40 }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
    </div>
  );
}
