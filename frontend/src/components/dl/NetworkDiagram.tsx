import type { ForwardPropagationResponse } from "../../services/api";
import { nexusVar } from "../../utils/theme";

interface Props {
  inputSize: number;
  layerSizes: number[];
  revealStage: number; // 0 = nothing computed yet; for layer index li (0-based): li*2+1 = weighted sum shown, li*2+2 = activated output shown
  inputValues: number[] | null;
  forwardResult: ForwardPropagationResponse | null;
}

const COL_WIDTH = 130;
const ROW_GAP = 52;
const RADIUS = 17;
const PAD = 40;

// A real diagram of the network's actual current architecture and (once a
// forward pass has run) its actual per-neuron values — node positions and
// counts come directly from inputSize/layerSizes, nothing is a fixed
// decorative picture.
export default function NetworkDiagram({ inputSize, layerSizes, revealStage, inputValues, forwardResult }: Props) {
  const columnCounts = [inputSize, ...layerSizes];
  const columns = columnCounts.length;
  const maxCount = Math.max(...columnCounts);
  const width = PAD * 2 + (columns - 1) * COL_WIDTH;
  const height = PAD * 2 + (maxCount - 1) * ROW_GAP;

  const nodeY = (count: number, i: number) => {
    const totalSpan = (count - 1) * ROW_GAP;
    const start = (height - totalSpan) / 2;
    return start + i * ROW_GAP;
  };
  const nodeX = (col: number) => PAD + col * COL_WIDTH;

  const edgeActive = (fromCol: number) => revealStage >= fromCol * 2 + 1;
  const layerZVisible = (li: number) => revealStage >= li * 2 + 1;
  const layerOutVisible = (li: number) => revealStage >= li * 2 + 2;

  return (
    <div className="overflow-x-auto rounded-xl border border-nexus-border bg-nexus-surfaceAlt p-3">
      <svg width={width} height={height} className="mx-auto">
        {/* edges */}
        {columnCounts.slice(0, -1).map((count, col) => {
          const nextCount = columnCounts[col + 1];
          const active = edgeActive(col);
          return Array.from({ length: count }).flatMap((_, a) =>
            Array.from({ length: nextCount }).map((_, b) => (
              <line
                key={`e-${col}-${a}-${b}`}
                x1={nodeX(col)}
                y1={nodeY(count, a)}
                x2={nodeX(col + 1)}
                y2={nodeY(nextCount, b)}
                stroke={active ? nexusVar("accent") : nexusVar("border")}
                strokeWidth={active ? 1.4 : 1}
                opacity={active ? 0.55 : 0.35}
              />
            ))
          );
        })}

        {/* input nodes */}
        {Array.from({ length: inputSize }).map((_, i) => (
          <g key={`in-${i}`}>
            <circle cx={nodeX(0)} cy={nodeY(inputSize, i)} r={RADIUS} fill={nexusVar("surface")} stroke={nexusVar("data")} strokeWidth={2} />
            <text x={nodeX(0)} y={nodeY(inputSize, i) + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill={nexusVar("data")}>
              {inputValues ? inputValues[i]?.toFixed(2) ?? "x" : `x${i + 1}`}
            </text>
          </g>
        ))}

        {/* layer nodes */}
        {layerSizes.map((size, li) => {
          const col = li + 1;
          const zShown = layerZVisible(li);
          const outShown = layerOutVisible(li);
          return Array.from({ length: size }).map((_, i) => {
            const neuron = forwardResult?.layers[li]?.neurons[i];
            const stroke = outShown ? nexusVar("good") : zShown ? nexusVar("yellow") : nexusVar("border");
            const label = outShown && neuron ? neuron.output.toFixed(2) : zShown && neuron ? neuron.z.toFixed(2) : "";
            return (
              <g key={`l-${li}-${i}`}>
                <circle
                  cx={nodeX(col)}
                  cy={nodeY(size, i)}
                  r={RADIUS}
                  fill={outShown ? nexusVar("good", 0.15) : zShown ? nexusVar("yellow", 0.15) : nexusVar("surface")}
                  stroke={stroke}
                  strokeWidth={2}
                  style={{ transition: "fill 300ms, stroke 300ms" }}
                />
                <text
                  x={nodeX(col)}
                  y={nodeY(size, i) + 4}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontFamily="monospace"
                  fill={outShown ? nexusVar("good") : zShown ? nexusVar("yellow") : nexusVar("muted")}
                >
                  {label}
                </text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}
