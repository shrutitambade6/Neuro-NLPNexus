import { Fragment, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import type { TrellisStepOut } from "../../services/api";
import { nexusVar } from "../../utils/theme";
import { FAMILY_CLASSES, familyOf } from "../../utils/posTags";

interface ViterbiTrellisProps {
  trellis: TrellisStepOut[];
  tagSet: string[];
  tokens: string[];
  bestPath: string[];
}

const LABEL_COL_W = 60;
const HEADER_ROW_H = 30;
const CELL_W = 78;
const CELL_H = 34;
const COLUMN_STAGGER = 0.28;

// Renders the real Viterbi dynamic-programming table: one column per word,
// one row per tag, every cell showing the actual log-probability score
// this backend computed for that (word, tag) pair. Cell intensity is a
// per-column heatmap (which tag looks best AT THIS WORD, relative to the
// other 10 — cross-column comparison isn't meaningful since log-scores
// keep compounding as the sentence gets longer), and the real backtraced
// best path is traced afterward with a gold line, the same "gold =
// highlighted answer" convention MatrixGrid already uses elsewhere in
// this app.
export default function ViterbiTrellis({ trellis, tagSet, tokens, bestPath }: ViterbiTrellisProps) {
  const reduceMotion = useReducedMotion();
  const n = trellis.length;

  const cellX = (t: number) => LABEL_COL_W + t * CELL_W + CELL_W / 2;
  const cellY = (tagIndex: number) => HEADER_ROW_H + tagIndex * CELL_H + CELL_H / 2;

  const perColumnRange = useMemo(
    () =>
      trellis.map((step) => {
        const scores = step.cells.map((c) => c.log_score);
        return { min: Math.min(...scores), max: Math.max(...scores) };
      }),
    [trellis]
  );

  const pathD = useMemo(() => {
    return bestPath
      .map((tag, t) => `${t === 0 ? "M" : "L"} ${cellX(t)} ${cellY(tagSet.indexOf(tag))}`)
      .join(" ");
  }, [bestPath, tagSet]);

  const totalRevealTime = reduceMotion ? 0 : n * COLUMN_STAGGER + 0.4;
  const width = LABEL_COL_W + n * CELL_W;
  const height = HEADER_ROW_H + tagSet.length * CELL_H;

  return (
    <div className="overflow-x-auto">
      <div className="relative inline-block" style={{ width, height }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: `${LABEL_COL_W}px repeat(${n}, ${CELL_W}px)` }}
        >
          <div style={{ height: HEADER_ROW_H }} />
          {tokens.map((tok, t) => (
            <div
              key={`h-${t}`}
              className="flex items-center justify-center text-[11px] font-mono text-nexus-muted truncate px-1"
              style={{ height: HEADER_ROW_H }}
              title={tok}
            >
              {tok}
            </div>
          ))}

          {tagSet.map((tag) => (
            <Fragment key={tag}>
              <div
                key={`label-${tag}`}
                className={`flex items-center justify-center text-[11px] font-mono font-medium ${FAMILY_CLASSES[familyOf(tag)].text}`}
                style={{ height: CELL_H }}
              >
                {tag}
              </div>
              {trellis.map((step, t) => {
                const cell = step.cells.find((c) => c.tag === tag)!;
                const { min, max } = perColumnRange[t];
                const norm = max === min ? 0.5 : (cell.log_score - min) / (max - min);
                const isOnPath = bestPath[t] === tag;
                return (
                  <motion.div
                    key={`${tag}-${t}`}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: reduceMotion ? 0 : t * COLUMN_STAGGER }}
                    className="flex items-center justify-center text-[10px] font-mono border border-nexus-border/40"
                    style={{
                      height: CELL_H,
                      background: nexusVar("accent", 0.08 + norm * 0.55),
                      outline: isOnPath ? `2px solid ${nexusVar("gold")}` : "none",
                      outlineOffset: -2,
                    }}
                    title={`${tag} at "${step.token}": log score ${cell.log_score}${cell.backpointer ? `, from ${cell.backpointer}` : ""}`}
                  >
                    <span className={isOnPath ? "text-nexus-text font-semibold" : "text-nexus-muted"}>
                      {cell.log_score.toFixed(2)}
                    </span>
                  </motion.div>
                );
              })}
            </Fragment>
          ))}
        </div>

        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          style={{ overflow: "visible" }}
        >
          <motion.path
            d={pathD}
            fill="none"
            stroke={nexusVar("gold")}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: totalRevealTime }}
          />
        </svg>
      </div>
    </div>
  );
}
