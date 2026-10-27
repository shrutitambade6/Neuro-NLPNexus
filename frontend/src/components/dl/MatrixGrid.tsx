import { nexusVar } from "../../utils/theme";

// A small, dependency-free heatmap renderer for a 2D matrix of real numbers
// — reused for the input image, the feature map, the activated map, and
// the pooled map in the CNN Lab, so all four stages of the real pipeline
// render with the same visual language (cell color intensity = real value,
// not a decorative placeholder).
//
// Cell fill is a translucent accent-blue overlay (nexusVar with alpha), not
// an opaque color — low-value cells stay close to whatever's beneath them
// (the surrounding bg-nexus-bg container) and high-value cells become a
// saturated blue, and because that's alpha compositing rather than a fixed
// hex, it reads correctly as "low salience -> high salience" in both a
// dark and a light container with zero extra theme logic.
interface MatrixGridProps {
  matrix: number[][];
  cellSize?: number;
  editable?: boolean;
  onCellChange?: (row: number, col: number, value: number) => void;
  colorFrom?: string; // low-value color (CSS var or hex)
  colorTo?: string; // high-value color
  highlight?: { row: number; col: number } | null;
  decimals?: number;
}

function normalize(matrix: number[][]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const row of matrix) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

export default function MatrixGrid({
  matrix,
  cellSize = 36,
  editable = false,
  onCellChange,
  highlight = null,
  decimals = 2,
}: MatrixGridProps) {
  const { min, max } = normalize(matrix);

  return (
    <div
      className="inline-grid gap-0.5 rounded-lg bg-nexus-bg p-1.5 border border-nexus-border"
      style={{ gridTemplateColumns: `repeat(${matrix[0]?.length ?? 0}, ${cellSize}px)` }}
    >
      {matrix.map((row, r) =>
        row.map((v, c) => {
          const t = (v - min) / (max - min); // 0..1
          const isHighlighted = highlight && highlight.row === r && highlight.col === c;
          const bg = nexusVar("accent", 0.1 + t * 0.7);
          return editable ? (
            <input
              key={`${r}-${c}`}
              value={v}
              onChange={(e) => onCellChange?.(r, c, Number(e.target.value))}
              className="text-center text-[11px] font-mono rounded outline-none border border-nexus-border/40 focus:border-nexus-accent text-nexus-text"
              style={{ width: cellSize, height: cellSize, background: bg }}
            />
          ) : (
            <div
              key={`${r}-${c}`}
              className="flex items-center justify-center text-[11px] font-mono rounded border border-nexus-border/40 text-nexus-text transition-all duration-300"
              style={{
                width: cellSize,
                height: cellSize,
                background: bg,
                outline: isHighlighted ? `2px solid ${nexusVar("yellow")}` : "none",
                outlineOffset: -2,
              }}
            >
              {v.toFixed(decimals)}
            </div>
          );
        })
      )}
    </div>
  );
}
