import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

import { NAV_ITEMS } from "../utils/navigation";

// Six labs positioned around a circle in fixed % coordinates (not
// trig-computed on the fly — simpler, and identical on every render).
// Reuses the same status/path data as the sidebar, so a locked node here
// can never point somewhere the rest of the app disagrees is real.
const ORBIT_LABELS = [
  "Parsing Lab",
  "Semantic Lab",
  "Language Modeling",
  "Discourse Lab",
  "Text Processing",
  "Real-World NLP",
];

const POSITIONS = [
  { top: "4%", left: "50%" },
  { top: "26%", left: "88%" },
  { top: "74%", left: "88%" },
  { top: "96%", left: "50%" },
  { top: "74%", left: "12%" },
  { top: "26%", left: "12%" },
];

export default function NlpOrbit() {
  const navigate = useNavigate();
  const nodes = ORBIT_LABELS.map((label) => NAV_ITEMS.find((item) => item.label === label)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item)
  );

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* connecting rings, decorative only */}
      <div className="absolute inset-[8%] rounded-full border border-nexus-border" aria-hidden="true" />
      <div className="absolute inset-[30%] rounded-full border border-nexus-border/60" aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-nexus-accent/40 bg-nexus-surface px-4 py-3 text-center shadow-glow">
          <p className="font-display text-sm font-semibold text-nexus-text">NeuroNLP Nexus</p>
        </div>
      </div>

      {nodes.map((node, i) => {
        const pos = POSITIONS[i];
        return (
          <button
            key={node.path}
            onClick={() => navigate(node.path)}
            style={{ top: pos.top, left: pos.left }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
          >
            <span
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors motion-safe:animate-pulse motion-safe:[animation-duration:3s] ${
                node.status === "ready"
                  ? "border-nexus-accent/60 bg-nexus-accent/10 group-hover:bg-nexus-accent/25"
                  : "border-nexus-border bg-nexus-surface"
              }`}
            >
              <node.icon
                size={16}
                className={node.status === "ready" ? "text-nexus-accent" : "text-nexus-muted"}
              />
              {node.status === "phase-planned" && (
                <Lock size={9} className="absolute -top-0.5 -right-0.5 text-nexus-muted" />
              )}
            </span>
            <span className="text-[10px] text-nexus-muted group-hover:text-nexus-text transition-colors max-w-[80px] text-center leading-tight">
              {node.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
