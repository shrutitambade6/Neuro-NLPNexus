import { ArrowRight, BrainCircuit } from "lucide-react";

import type { BookTheme } from "../../utils/bookCatalog";
import { nexusVar } from "../../utils/theme";

interface Props {
  theme: BookTheme;
  face: "front" | "back";
}

// Front/back cover art (points 3, 4, 15). A gradient built from the book's
// own two accent tokens (never a fixed hex), a faint decorative
// token/neuron "chain" pattern per point 3/4 ("could subtly contain...
// token -> syntax -> semantics -> meaning," kept elegant rather than
// crowded), and the brand/edition text block. The back cover reuses the
// same gradient and chain motif at lower prominence rather than a second,
// unrelated design — point 2 only asks that a back cover exist, not that
// it compete with the front for attention.
export default function BookCover({ theme, face }: Props) {
  const isFront = face === "front";

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${isFront ? "rounded-r-md" : "rounded-l-md"}`}
      style={{
        background: `linear-gradient(135deg, ${nexusVar(theme.primary, 0.94)}, ${nexusVar(
          "bg",
          1,
        )} 45%, ${nexusVar(theme.secondary, 0.5)} 130%)`,
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.45), inset 0 0 1px rgba(255,255,255,0.08)",
      }}
    >
      {/* Faint decorative chain — e.g. Token -> Syntax -> Semantics -> Meaning
          — running diagonally in the background. Low opacity on purpose: a
          hint of the subject, not an illustration. */}
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-end justify-center gap-3 pr-6 opacity-[0.16]"
        aria-hidden="true"
      >
        {theme.chain.map((step, i) => (
          <div key={step} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
            {i > 0 && <ArrowRight size={10} />}
            <span>{step}</span>
          </div>
        ))}
      </div>

      {/* Subtle node/graph texture — a handful of faint dots + connecting
          lines, suggesting a semantic graph (NLP) or a neural net (DL)
          without drawing a literal, attention-grabbing diagram. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden="true">
        <g stroke="white" strokeWidth={1} fill="white">
          <line x1="12%" y1="20%" x2="34%" y2="38%" />
          <line x1="34%" y1="38%" x2="20%" y2="58%" />
          <line x1="34%" y1="38%" x2="52%" y2="30%" />
          <line x1="20%" y1="58%" x2="40%" y2="74%" />
          <circle cx="12%" cy="20%" r="2.5" />
          <circle cx="34%" cy="38%" r="3" />
          <circle cx="20%" cy="58%" r="2.5" />
          <circle cx="52%" cy="30%" r="2.5" />
          <circle cx="40%" cy="74%" r="2.5" />
        </g>
      </svg>

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-[10%] text-center">
        {isFront ? (
          <>
            <BrainCircuit size={28} className="text-white/90" />
            <div>
              <p className="font-display text-2xl sm:text-3xl font-bold tracking-[0.08em] text-white">NEURO</p>
              <p className="font-display text-2xl sm:text-3xl font-bold tracking-[0.08em] text-white">NLP</p>
              <p className="font-display text-2xl sm:text-3xl font-bold tracking-[0.08em] text-white">NEXUS</p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Interactive AI Learning Library</p>
            <span className="h-px w-20 bg-white/30" />
            <p className="text-sm font-medium text-white/90">{theme.subtitle}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">{theme.edition}</p>
          </>
        ) : (
          <>
            <p className="font-display text-sm font-semibold tracking-[0.15em] text-white/80">NEURO NLP NEXUS</p>
            <span className="h-px w-12 bg-white/25" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/50">{theme.edition}</p>
          </>
        )}
      </div>
    </div>
  );
}
