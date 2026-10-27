// THE "BEHIND THE NEXUS" KNOWLEDGE CONSTELLATION (2026-10-08 user spec,
// section 4/6) — the section's core visual. A center "NEURONLP NEXUS"
// core with three orbiting nodes (NLP mentor, DL mentor, Builder)
// connected to it by glowing lines, built on the exact same technical
// pattern as the hero's <NexusSolarSystem /> (deep-space backdrop with
// fixed literal colors — never theme-reactive nexus-* tokens, which
// wash out to near-white in light theme; deterministic seeded "stars";
// a rotating ring + counter-rotating nodes so labels stay upright;
// click dims the rest and opens a bottom-anchored detail panel). Three
// nodes instead of many concepts, and the panel renders a
// <MentorProfile>/<BuilderProfile> instead of a lab link — otherwise
// deliberately the same shape, per the spec's own "reuse existing
// architecture, don't duplicate code unnecessarily" instruction.
//
// Orbit placement is a loose triangle (NLP top, DL bottom-left, Builder
// bottom-right) that echoes the spec's own illustrative diagram without
// literally reproducing it (the spec explicitly says not to render that
// ASCII art).
import { useId, useMemo, useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Brain, BookOpen, Sparkles, X, ArrowLeft } from "lucide-react";

import MentorNode, { polarPoint, type NodePlacement } from "./MentorNode";
import OrbitConnection from "./OrbitConnection";
import MentorProfile from "./MentorProfile";
import BuilderProfile from "./BuilderProfile";
import { MENTORS, BUILDER, NEXUS_CORE_LABEL, type BehindNexusNodeId } from "../../data/behindNexus";
import { DURATION, EASE_STANDARD } from "../../motion/tokens";

const SPACE_BG_FROM = "#07152F";
const SPACE_BG_TO = "#050B1C";
const STAR_COLOR = "232, 238, 248";

const NODE_PLACEMENT: Record<BehindNexusNodeId, NodePlacement> = {
  nlp: { angleDeg: -90, radiusPct: 36 },
  dl: { angleDeg: 150, radiusPct: 36 },
  builder: { angleDeg: 30, radiusPct: 36 },
};

// Theme-token RGB triplets as literal numbers (spec section 5's color
// system, matched 1:1 to this app's own --nexus-purple/gold/data/accent
// — see index.css). Kept as literals here rather than read through
// nexusVar()/CSS vars because these also feed plain-number SVG/line
// colors in OrbitConnection, which can't resolve a var() the same way a
// Tailwind class can; the values themselves are identical to what the
// rest of the app already uses for these same three accents.
const NODE_COLOR: Record<BehindNexusNodeId, string> = {
  nlp: "167 139 250", // --nexus-purple
  dl: "255 183 3", // --nexus-gold
  builder: "66 217 255", // --nexus-data (electric cyan — spec's "Builder: electric blue/cyan")
};

const RING_DURATION_S = 150; // deliberately slow — "futuristic academic
// universe," not a spinning landing-page graphic (spec section 14).
const RING_DURATION_HOVER_S = 230; // "orbit slows slightly" on hover (spec section 6).

function makeStars(count: number) {
  let seed = 4242;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    size: rand() < 0.22 ? 1.8 + rand() * 1.6 : 1 + rand() * 1,
    bright: rand() < 0.22,
  }));
}

const ICONS: Record<BehindNexusNodeId, typeof Brain> = { nlp: BookOpen, dl: Brain, builder: Sparkles };
const LABELS: Record<BehindNexusNodeId, string> = { nlp: "NLP", dl: "DEEP LEARNING", builder: "BUILDER" };
const NAMES: Record<BehindNexusNodeId, string> = {
  nlp: MENTORS[0].name,
  dl: MENTORS[1].name,
  builder: BUILDER.name,
};

export default function NexusOrbit({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const stars = useMemo(() => makeStars(42), []);
  const panelTitleId = useId();
  const [focusedId, setFocusedId] = useState<BehindNexusNodeId | null>(null);
  const [hoveredId, setHoveredId] = useState<BehindNexusNodeId | null>(null);

  const close = useCallback(() => setFocusedId(null), []);

  useEffect(() => {
    if (!focusedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId, close]);

  const ringDuration = reduceMotion ? 0 : hoveredId ? RING_DURATION_HOVER_S : RING_DURATION_S;
  const nodeIds: BehindNexusNodeId[] = ["nlp", "dl", "builder"];

  const focusedMentor = focusedId === "nlp" ? MENTORS[0] : focusedId === "dl" ? MENTORS[1] : null;

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[420px] lg:max-w-[520px] select-none ${className ?? ""}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle at 50% 50%, ${SPACE_BG_FROM} 0%, ${SPACE_BG_TO} 75%)` }}
      />
      {stars.map((s) => (
        <div
          key={s.id}
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: `rgb(${STAR_COLOR})`,
            opacity: s.bright ? 0.9 : 0.5,
            boxShadow: s.bright ? `0 0 ${s.size * 2.5}px rgba(${STAR_COLOR}, 0.8)` : undefined,
          }}
        />
      ))}

      {/* Orbit ring guide */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx={50} cy={50} r={36} fill="none" stroke={`rgba(${STAR_COLOR}, 0.25)`} strokeWidth={0.25} />
      </svg>

      {/* Center Nexus core — platform blue with a subtle white/cyan
          glow (spec section 5: "existing platform blue... subtle
          white/cyan glow"), echoing the hero's own core (section 15:
          "do not introduce a completely new metaphor"). */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: "22%",
          height: "22%",
          x: "-50%",
          y: "-50%",
          background: "radial-gradient(circle at 38% 32%, rgb(232,238,248) 0%, rgb(var(--nexus-data)) 25%, rgb(var(--nexus-accent)) 100%)",
        }}
        animate={
          reduceMotion
            ? undefined
            : {
                boxShadow: [
                  "0 0 28px rgb(var(--nexus-accent) / 0.5)",
                  "0 0 46px rgb(var(--nexus-accent) / 0.75)",
                  "0 0 28px rgb(var(--nexus-accent) / 0.5)",
                ],
              }
        }
        transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="px-1 text-[9px] font-bold leading-tight tracking-wide text-[#050B1C] drop-shadow">
          {NEXUS_CORE_LABEL}
        </span>
      </motion.div>

      {/* Rotating ring: connecting lines + the three nodes, all placed
          by the same fixed polar point so they sweep together. */}
      <motion.div
        className="absolute inset-0"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: ringDuration, repeat: Infinity, ease: "linear" }}
      >
        {nodeIds.map((id) => {
          const point = polarPoint(NODE_PLACEMENT[id].angleDeg, NODE_PLACEMENT[id].radiusPct);
          const isHovered = hoveredId === id;
          const isFocused = focusedId === id;
          return (
            <OrbitConnection
              key={id}
              toX={point.x}
              toY={point.y}
              color={NODE_COLOR[id]}
              bright={isHovered || isFocused}
              dimmed={focusedId !== null && !isFocused}
            />
          );
        })}
        {nodeIds.map((id) => (
          <div
            key={id}
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === id ? null : cur))}
            onFocus={() => setHoveredId(id)}
            onBlur={() => setHoveredId((cur) => (cur === id ? null : cur))}
          >
            <MentorNode
              placement={NODE_PLACEMENT[id]}
              ringDurationS={ringDuration}
              icon={ICONS[id]}
              label={LABELS[id]}
              name={NAMES[id]}
              colorRgb={NODE_COLOR[id]}
              active={focusedId === id}
              dimmed={focusedId !== null && focusedId !== id}
              onActivate={() => setFocusedId(id)}
            />
          </div>
        ))}
      </motion.div>

      {/* Focused-node detail panel — "camera/focus moves toward node,
          others dim... clear CLOSE/BACK TO NEXUS control" (spec
          section 6). */}
      <AnimatePresence>
        {focusedId && (
          <>
            <motion.button
              type="button"
              aria-label="Close and return to the Nexus"
              className="absolute inset-0 z-30 rounded-full bg-[#050B1C]/55 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.micro }}
              onClick={close}
            />
            <motion.div
              role="dialog"
              aria-labelledby={panelTitleId}
              className="absolute inset-x-3 bottom-3 z-40 rounded-xl border border-nexus-border bg-nexus-surface/95 p-4 text-left shadow-2xl backdrop-blur-md sm:inset-x-8 sm:p-5"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: DURATION.panel, ease: EASE_STANDARD }}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-nexus-muted transition-colors hover:text-nexus-text"
                >
                  <ArrowLeft size={14} /> BACK TO NEXUS
                </button>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="rounded-md p-1 text-nexus-muted transition-colors hover:bg-nexus-surfaceAlt hover:text-nexus-text"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 id={panelTitleId} className="sr-only">
                {focusedId === "builder" ? BUILDER.name : focusedMentor?.name}
              </h3>
              {focusedId === "builder" ? <BuilderProfile /> : focusedMentor ? <MentorProfile mentor={focusedMentor} /> : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
