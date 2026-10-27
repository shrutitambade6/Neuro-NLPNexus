// Mobile fallback for the knowledge constellation (spec section 17):
// "Do NOT force three nodes into a tiny orbit... transform the
// experience into Nexus center -> NLP Mentor -> DL Mentor -> Builder,
// with elegant vertical transitions." Below the `sm` breakpoint
// <NexusOrbit /> is hidden entirely (see BehindNexus.tsx) and this
// renders instead: one vertical list, each row an accordion that opens
// inline to the SAME <MentorProfile>/<BuilderProfile> content the
// desktop detail panel uses — same storytelling concept, same real
// content, no information or functionality lost, just a different
// (non-orbiting) layout for a viewport too narrow for one to read
// comfortably.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, BookOpen, ChevronDown, Sparkles } from "lucide-react";

import MentorProfile from "./MentorProfile";
import BuilderProfile from "./BuilderProfile";
import { MENTORS, BUILDER, NEXUS_CORE_LABEL, type BehindNexusNodeId } from "../../data/behindNexus";
import { DURATION, EASE_STANDARD } from "../../motion/tokens";
import { nexusVar } from "../../utils/theme";

const ROWS: Array<{ id: BehindNexusNodeId; icon: typeof Brain; label: string; name: string; color: "purple" | "gold" | "data" }> = [
  { id: "nlp", icon: BookOpen, label: "NLP", name: MENTORS[0].name, color: "purple" },
  { id: "dl", icon: Brain, label: "DEEP LEARNING", name: MENTORS[1].name, color: "gold" },
  { id: "builder", icon: Sparkles, label: "BUILDER", name: BUILDER.name, color: "data" },
];

export default function MobileConstellation({ className }: { className?: string }) {
  const [openId, setOpenId] = useState<BehindNexusNodeId | null>(null);

  return (
    <div className={className}>
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: `radial-gradient(circle at 38% 32%, rgb(232,238,248) 0%, ${nexusVar("data")} 25%, ${nexusVar("accent")} 100%)` }}
        >
          <span className="px-1 text-[8px] font-bold leading-tight text-[#050B1C]">{NEXUS_CORE_LABEL}</span>
        </div>
        <div className="h-6 w-px bg-nexus-border" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        {ROWS.map((row) => {
          const isOpen = openId === row.id;
          const mentor = row.id === "nlp" ? MENTORS[0] : row.id === "dl" ? MENTORS[1] : null;
          return (
            <div key={row.id} className="rounded-xl border border-nexus-border bg-nexus-surface">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : row.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: nexusVar(row.color, 0.18) }}
                  >
                    <row.icon size={18} style={{ color: nexusVar(row.color) }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: nexusVar(row.color) }}>
                      {row.label}
                    </p>
                    <p className="text-sm font-medium text-nexus-text">{row.name}</p>
                  </div>
                </div>
                <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: DURATION.hover }}>
                  <ChevronDown size={16} className="text-nexus-muted" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: DURATION.panel, ease: EASE_STANDARD }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-nexus-border p-4">
                      {row.id === "builder" ? <BuilderProfile /> : mentor ? <MentorProfile mentor={mentor} /> : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
