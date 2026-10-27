import { PAGE_EDGE_JITTER, PAPER_BG, PAPER_EDGE } from "./paperTexture";

interface Props {
  thicknessPx: number;
  layers?: number;
}

// The visible page-edge stack — point 11's "|||||||||| instead of one flat
// rectangle." Rendered as a handful of thin, slightly offset paper-colored
// slivers sitting between the covers (translateZ'd behind the front cover
// in InteractiveBook), each with a tiny fixed jitter so the stack reads as
// real paper rather than a perfectly uniform ruler pattern.
export default function PageStack({ thicknessPx, layers = 7 }: Props) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {Array.from({ length: layers }).map((_, i) => {
        const depth = -2 - (i * (thicknessPx - 4)) / layers;
        const jitter = PAGE_EDGE_JITTER[i % PAGE_EDGE_JITTER.length];
        return (
          <div
            key={i}
            className="absolute inset-0 rounded-r-sm"
            style={{
              transform: `translateZ(${depth}px) translateX(${jitter}px)`,
              backgroundColor: i % 2 === 0 ? PAPER_BG : PAPER_EDGE,
              boxShadow: "inset -2px 0 3px rgba(0,0,0,0.08)",
            }}
          />
        );
      })}
    </div>
  );
}
