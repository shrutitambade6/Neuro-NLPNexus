import { motion, useReducedMotion } from "framer-motion";

import NexiMascot, { type NexiMood } from "./NexiMascot";

export type LoadingKind = "default" | "tokens" | "parse" | "semantic" | "neural" | "search";

const KIND_MOOD: Record<LoadingKind, NexiMood> = {
  default: "thinking",
  tokens: "thinking",
  parse: "thinking",
  semantic: "learning",
  neural: "learning",
  search: "searching",
};

const DEFAULT_LABEL: Record<LoadingKind, string> = {
  default: "Working on it…",
  tokens: "Splitting into tokens…",
  parse: "Building the parse tree…",
  semantic: "Connecting concepts…",
  neural: "Signal moving through the network…",
  search: "Searching…",
};

function TokensVisual({ animate }: { animate: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="h-2.5 w-4 rounded-sm bg-nexus-accent/70"
          animate={animate ? { opacity: [0.25, 1, 0.25] } : undefined}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function ParseVisual({ animate }: { animate: boolean }) {
  // A tiny tree that grows bottom-up, matching how the real Parsing Lab's
  // tree actually builds (leaves first, root last).
  const nodes = [
    { cx: 20, cy: 26, delay: 0 },
    { cx: 8, cy: 14, delay: 0.35 },
    { cx: 32, cy: 14, delay: 0.35 },
    { cx: 20, cy: 4, delay: 0.7 },
  ];
  return (
    <svg width="40" height="30" viewBox="0 0 40 30">
      <line x1="20" y1="26" x2="8" y2="14" stroke="rgb(var(--nexus-border))" strokeWidth="1.5" />
      <line x1="20" y1="26" x2="32" y2="14" stroke="rgb(var(--nexus-border))" strokeWidth="1.5" />
      <line x1="8" y1="14" x2="20" y2="4" stroke="rgb(var(--nexus-border))" strokeWidth="1.5" />
      <line x1="32" y1="14" x2="20" y2="4" stroke="rgb(var(--nexus-border))" strokeWidth="1.5" />
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.cx}
          cy={n.cy}
          r="3"
          fill="rgb(var(--nexus-accent))"
          initial={animate ? { opacity: 0.2, scale: 0.6 } : undefined}
          animate={animate ? { opacity: [0.2, 1, 0.2], scale: [0.6, 1, 0.6] } : undefined}
          transition={{ duration: 1.4, repeat: Infinity, delay: n.delay, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}

function SemanticVisual({ animate }: { animate: boolean }) {
  const nodes = [
    { cx: 6, cy: 15 },
    { cx: 20, cy: 5 },
    { cx: 34, cy: 15 },
    { cx: 20, cy: 25 },
  ];
  return (
    <svg width="40" height="30" viewBox="0 0 40 30">
      {nodes.map((n, i) => (
        <motion.line
          key={i}
          x1="20"
          y1="15"
          x2={n.cx}
          y2={n.cy}
          stroke="rgb(var(--nexus-purple))"
          strokeWidth="1.5"
          initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
          animate={animate ? { pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] } : undefined}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
        />
      ))}
      <circle cx="20" cy="15" r="3.2" fill="rgb(var(--nexus-purple))" />
      {nodes.map((n, i) => (
        <circle key={i} cx={n.cx} cy={n.cy} r="2.4" fill="rgb(var(--nexus-data))" />
      ))}
    </svg>
  );
}

function NeuralVisual({ animate }: { animate: boolean }) {
  return (
    <svg width="46" height="24" viewBox="0 0 46 24">
      <line x1="4" y1="12" x2="42" y2="12" stroke="rgb(var(--nexus-border))" strokeWidth="1.5" />
      {[4, 16, 28, 42].map((cx, i) => (
        <circle key={i} cx={cx} cy="12" r="3" fill="rgb(var(--nexus-accentDim))" />
      ))}
      <motion.circle
        cx="4"
        cy="12"
        r="3.4"
        fill="rgb(var(--nexus-data))"
        initial={animate ? { cx: 4, opacity: 1 } : undefined}
        animate={animate ? { cx: [4, 42], opacity: [1, 1, 0] } : undefined}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/**
 * A contextual loading state — a small on-brand visual for what's actually
 * happening (tokens splitting, a tree growing, concepts connecting, a
 * signal crossing a network) plus NEXI, instead of a generic spinner
 * everywhere (spec #27). Falls back to a static frame + label under
 * prefers-reduced-motion.
 */
export default function LoadingAnimation({
  kind = "default",
  label,
  className,
}: {
  kind?: LoadingKind;
  label?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;
  const text = label ?? DEFAULT_LABEL[kind];

  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-6 ${className ?? ""}`}>
      <NexiMascot mood={KIND_MOOD[kind]} size="sm" />
      <div className="h-[30px] flex items-center justify-center">
        {kind === "tokens" && <TokensVisual animate={animate} />}
        {kind === "parse" && <ParseVisual animate={animate} />}
        {kind === "semantic" && <SemanticVisual animate={animate} />}
        {kind === "neural" && <NeuralVisual animate={animate} />}
      </div>
      <p className="text-xs text-nexus-muted">{text}</p>
    </div>
  );
}
