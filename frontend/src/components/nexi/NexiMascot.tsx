import { motion, useReducedMotion } from "framer-motion";

import { nexusVar } from "../../utils/theme";

export type NexiMood =
  | "welcome"
  | "thinking"
  | "idea"
  | "success"
  | "mistake"
  | "searching"
  | "learning"
  | "challenge"
  | "empty"
  | "waving"
  | "neutral";

interface MoodConfig {
  eyes: "open" | "happy" | "sleepy" | "soft" | "narrow";
  mouth: "smile" | "bigSmile" | "flat" | "o" | "wavy" | "small";
  accessory: "spark" | "magnifier" | "headband" | "zzz" | "wave" | "neuralGlow" | null;
  tilt: number;
}

// One consistent character, one consistent rig — every mood is just a
// different combination of eyes/mouth/accessory/tilt on the same base head,
// rather than a separate illustration per mood. Keeps NEXI visually
// consistent everywhere it appears (spec's own "maintain one consistent
// illustration language" rule) and keeps this to a single component instead
// of duplicating artwork per page.
const MOODS: Record<NexiMood, MoodConfig> = {
  welcome: { eyes: "happy", mouth: "smile", accessory: null, tilt: 0 },
  waving: { eyes: "happy", mouth: "smile", accessory: "wave", tilt: 4 },
  thinking: { eyes: "narrow", mouth: "flat", accessory: null, tilt: -4 },
  idea: { eyes: "open", mouth: "smile", accessory: "spark", tilt: 0 },
  success: { eyes: "happy", mouth: "bigSmile", accessory: null, tilt: 3 },
  mistake: { eyes: "soft", mouth: "wavy", accessory: null, tilt: -2 },
  searching: { eyes: "narrow", mouth: "small", accessory: "magnifier", tilt: 0 },
  learning: { eyes: "open", mouth: "smile", accessory: "neuralGlow", tilt: 0 },
  challenge: { eyes: "open", mouth: "smile", accessory: "headband", tilt: 0 },
  empty: { eyes: "sleepy", mouth: "flat", accessory: "zzz", tilt: 0 },
  neutral: { eyes: "open", mouth: "smile", accessory: null, tilt: 0 },
};

const SIZES = { sm: 28, md: 44, lg: 68, xl: 96 } as const;

interface Props {
  mood?: NexiMood;
  size?: keyof typeof SIZES | number;
  /** Idle bob + occasional blink. Off automatically under reduced motion. */
  animate?: boolean;
  className?: string;
  label?: string;
}

function Eyes({ style }: { style: MoodConfig["eyes"] }) {
  const pupil = "#0F172A"; // fixed dark ink — eyes are always a light socket, regardless of theme
  if (style === "happy") {
    return (
      <g stroke={pupil} strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M31 45 Q36 38 41 45" />
        <path d="M59 45 Q64 38 69 45" />
      </g>
    );
  }
  if (style === "sleepy") {
    return (
      <g stroke={pupil} strokeWidth="3.2" strokeLinecap="round">
        <path d="M31 44 H41" />
        <path d="M59 44 H69" />
      </g>
    );
  }
  if (style === "soft") {
    return (
      <g>
        <circle cx="36" cy="43" r="3.6" fill={pupil} />
        <circle cx="64" cy="43" r="3.6" fill={pupil} />
        <path d="M31 36 Q36 33 41 36" stroke={pupil} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M59 36 Q64 33 69 36" stroke={pupil} strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  if (style === "narrow") {
    return (
      <g stroke={pupil} strokeWidth="3.4" strokeLinecap="round">
        <path d="M30 42 Q36 39 42 41" />
        <path d="M58 41 Q64 39 70 42" />
      </g>
    );
  }
  // "open" — default round eyes with pupils looking slightly up (attentive)
  return (
    <g>
      <circle cx="36" cy="43" r="5.2" fill="white" />
      <circle cx="64" cy="43" r="5.2" fill="white" />
      <circle cx="37" cy="41.5" r="2.6" fill={pupil} />
      <circle cx="65" cy="41.5" r="2.6" fill={pupil} />
    </g>
  );
}

function Mouth({ style }: { style: MoodConfig["mouth"] }) {
  const ink = "#0F172A";
  switch (style) {
    case "bigSmile":
      return <path d="M38 58 Q50 72 62 58" stroke={ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />;
    case "flat":
      return <path d="M40 60 H60" stroke={ink} strokeWidth="3" strokeLinecap="round" />;
    case "o":
      return <circle cx="50" cy="61" r="4.5" fill="none" stroke={ink} strokeWidth="3" />;
    case "wavy":
      return <path d="M39 61 Q45 57 50 61 Q55 65 61 61" stroke={ink} strokeWidth="2.8" strokeLinecap="round" fill="none" />;
    case "small":
      return <path d="M45 60 Q50 63 55 60" stroke={ink} strokeWidth="2.8" strokeLinecap="round" fill="none" />;
    case "smile":
    default:
      return <path d="M40 58 Q50 66 60 58" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />;
  }
}

function Accessory({ kind, animate }: { kind: MoodConfig["accessory"]; animate: boolean }) {
  if (!kind) return null;
  if (kind === "spark") {
    return (
      <motion.g
        animate={animate ? { opacity: [0.5, 1, 0.5], scale: [0.9, 1.08, 0.9] } : undefined}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "80px 22px" }}
      >
        <path
          d="M80 14 L82.5 20 L89 22 L82.5 24 L80 30 L77.5 24 L71 22 L77.5 20 Z"
          fill={nexusVar("gold")}
        />
      </motion.g>
    );
  }
  if (kind === "magnifier") {
    return (
      <g stroke={nexusVar("text")} strokeWidth="2.4" fill="none">
        <circle cx="80" cy="32" r="7" />
        <line x1="85.2" y1="37.2" x2="91" y2="43" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "headband") {
    return <path d="M22 34 Q50 20 78 34" stroke={nexusVar("coral")} strokeWidth="4" strokeLinecap="round" fill="none" />;
  }
  if (kind === "zzz") {
    return (
      <motion.g
        fill={nexusVar("muted")}
        animate={animate ? { y: [0, -4, 0], opacity: [0.4, 0.9, 0.4] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <text x="76" y="24" fontSize="11" fontWeight="700">z</text>
        <text x="83" y="16" fontSize="8" fontWeight="700">z</text>
      </motion.g>
    );
  }
  if (kind === "wave") {
    return (
      <motion.g
        animate={animate ? { rotate: [0, 18, 0] } : undefined}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
        style={{ transformOrigin: "94px 55px" }}
      >
        <circle cx="94" cy="52" r="7" fill={nexusVar("accent")} />
      </motion.g>
    );
  }
  if (kind === "neuralGlow") {
    return (
      <motion.g
        stroke={nexusVar("data")}
        strokeWidth="1.4"
        fill={nexusVar("data")}
        animate={animate ? { opacity: [0.5, 1, 0.5] } : undefined}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="40" y1="20" x2="50" y2="16" />
        <line x1="50" y1="16" x2="60" y2="20" />
        <circle cx="40" cy="20" r="2" />
        <circle cx="50" cy="16" r="2.2" />
        <circle cx="60" cy="20" r="2" />
      </motion.g>
    );
  }
  return null;
}

/**
 * NEXI — the NeuroNLP Nexus companion. One rig, many moods (see NexiMood):
 * a rounded head, a blue→cyan gradient fill, a small yellow accent, and an
 * expression built from eyes+mouth+accessory. Idle bob and the occasional
 * blink are the only motion, and both are skipped under
 * prefers-reduced-motion — the expression itself (which carries the actual
 * meaning) never depends on animation to read correctly.
 */
export default function NexiMascot({ mood = "neutral", size = "md", animate = true, className, label }: Props) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animate && !reduceMotion;
  const px = typeof size === "number" ? size : SIZES[size];
  const cfg = MOODS[mood];
  const gradientId = "nexi-head-gradient";

  return (
    <motion.div
      className={className}
      style={{ width: px, height: px, display: "inline-block" }}
      animate={shouldAnimate ? { y: [0, -3, 0] } : undefined}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      role="img"
      aria-label={label ?? `NEXI, ${mood}`}
    >
      <svg viewBox="0 0 100 100" width={px} height={px} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={nexusVar("accent")} />
            <stop offset="100%" stopColor={nexusVar("data")} />
          </linearGradient>
        </defs>
        <g
          style={{
            transform: `rotate(${cfg.tilt}deg)`,
            transformOrigin: "50px 55px",
            filter: `drop-shadow(0 2px 6px rgb(var(--nexus-accent) / 0.35))`,
          }}
        >
          {/* Head */}
          <rect x="14" y="14" width="72" height="66" rx="26" fill={`url(#${gradientId})`} />
          {/* Small yellow accent chip — spec's "small yellow accent" */}
          <circle cx="24" cy="24" r="4" fill={nexusVar("yellow")} opacity="0.9" />
          <Eyes style={cfg.eyes} />
          <Mouth style={cfg.mouth} />
        </g>
        <Accessory kind={cfg.accessory} animate={shouldAnimate} />
      </svg>
    </motion.div>
  );
}
