// One orbiting node in the "Behind the Nexus" constellation (spec section
// 4/6) — covers all three identities (NLP mentor, DL mentor, Builder);
// which one it represents is just a color token + icon + label, same
// generic-node approach NexusSolarSystem.tsx's own <Planet> already
// uses for its concept planets. Counter-rotates against the shared
// orbit ring so its label/avatar always stay upright while still being
// carried around the ring by the ring's own rotation — identical
// technique to <Planet>.
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_STANDARD } from "../../motion/tokens";

export interface NodePlacement {
  angleDeg: number;
  radiusPct: number;
}

interface Props {
  placement: NodePlacement;
  ringDurationS: number;
  icon: LucideIcon;
  label: string; // "NLP" / "DEEP LEARNING" / "BUILDER"
  name: string; // person's name, shown under the label
  colorRgb: string; // "r g b" triplet (no rgb() wrapper) — one of the
  // existing --nexus-* tokens, read via getComputedStyle by the parent
  // so this stays theme-reactive without each node re-reading CSS vars.
  active: boolean;
  dimmed: boolean;
  onActivate: () => void;
}

function polarPct(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { left: `${50 + radiusPct * Math.cos(rad)}%`, top: `${50 + radiusPct * Math.sin(rad)}%` };
}

export function polarPoint(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 50 + radiusPct * Math.cos(rad), y: 50 + radiusPct * Math.sin(rad) };
}

export default function MentorNode({ placement, ringDurationS, icon: Icon, label, name, colorRgb, active, dimmed, onActivate }: Props) {
  const reduceMotion = useReducedMotion();
  const pos = polarPct(placement.angleDeg, placement.radiusPct);
  const color = `rgb(${colorRgb})`;

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: pos.left, top: pos.top, x: "-50%", y: "-50%" }}
      animate={reduceMotion ? undefined : { rotate: -360 }}
      transition={reduceMotion ? undefined : { duration: ringDurationS, repeat: Infinity, ease: "linear" }}
    >
      <motion.button
        type="button"
        onClick={onActivate}
        aria-label={`${label}: ${name} — open profile`}
        className="group relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050B1C]"
        style={{ width: 60, height: 60, outlineColor: color }}
        animate={{ scale: active ? 1.25 : 1, opacity: dimmed ? 0.3 : 1 }}
        whileHover={reduceMotion ? undefined : { scale: active ? 1.25 : 1.12 }}
        transition={{ duration: DURATION.hover, ease: EASE_STANDARD }}
      >
        {/* Subtle hover particles — a handful of tiny motes, never a
            "particle explosion" (spec section 14's explicit "avoid"
            list). Pure CSS opacity pulse via group-hover, no JS timers. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-70 motion-reduce:hidden"
              style={{
                background: color,
                left: `${50 + 42 * Math.cos((i * 120 * Math.PI) / 180)}%`,
                top: `${50 + 42 * Math.sin((i * 120 * Math.PI) / 180)}%`,
                transitionDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </span>

        {/* Abstract avatar — a knowledge-node glow + icon silhouette, NOT
            a photo (spec section 16: no scraped images). Structured so a
            real approved photo can later replace this <span> with an
            <img>, no other change needed. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${color} 0%, rgb(${colorRgb} / 0.5) 55%, rgb(${colorRgb} / 0.12) 100%)`,
            boxShadow: `0 0 ${active ? 26 : 14}px rgb(${colorRgb} / ${active ? 0.8 : 0.5})`,
          }}
        />
        <Icon size={20} className="relative z-10 text-white drop-shadow" aria-hidden="true" />
      </motion.button>

      <motion.div
        className="pointer-events-none mt-1.5 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-center"
        style={{ background: "rgba(5, 11, 28, 0.72)" }}
        animate={{ opacity: dimmed ? 0.25 : 1 }}
        transition={{ duration: DURATION.hover }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color }}>
          {label}
        </p>
        <p className="text-[9px] leading-tight text-[rgb(232,238,248)]">{name}</p>
      </motion.div>
    </motion.div>
  );
}
