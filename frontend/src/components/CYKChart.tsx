import { motion } from "framer-motion";

import type { CYKCellOut } from "../services/api";

interface Props {
  tokens: string[];
  table: CYKCellOut[];
  revealedSpans: number; // how many span-rows to show so far (for step/play controls)
}

export default function CYKChart({ tokens, table, revealedSpans }: Props) {
  const n = tokens.length;
  const cellAt = (row: number, col: number) => table.find((c) => c.row === row && c.col === col);

  // Rendered bottom-up: row 1 (single words) at the bottom, full span at top,
  // matching how a CYK triangle is conventionally drawn.
  const rows = Array.from({ length: n }, (_, i) => n - i); // n, n-1, ..., 1

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        {rows.map((span) => (
          <div key={span} className="flex">
            {Array.from({ length: n - span + 1 }, (_, col) => {
              const cell = cellAt(span, col);
              const visible = span <= revealedSpans || span === n; // top row always shown once computed within reveal
              const hasContent = cell && cell.nonterminals.length > 0;
              return (
                <motion.div
                  key={`${span}-${col}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: span <= revealedSpans ? 1 : 0.15, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`w-20 h-16 border border-nexus-border flex items-center justify-center text-center px-1 ${
                    hasContent && span <= revealedSpans ? "bg-nexus-accent/10" : "bg-nexus-surface"
                  }`}
                  title={
                    hasContent
                      ? `Span ${span}, position ${col}\n${cell!.rules.join("\n")}`
                      : `Span ${span}, position ${col}`
                  }
                >
                  {visible && hasContent && span <= revealedSpans && (
                    <span className="text-[11px] font-mono text-nexus-data leading-tight">
                      {cell!.nonterminals.join(", ")}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
        <div className="flex mt-1">
          {tokens.map((t, i) => (
            <div key={i} className="w-20 text-center text-[10px] text-nexus-muted font-mono truncate px-1">
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
