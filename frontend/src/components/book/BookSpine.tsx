import type { BookTheme } from "../../utils/bookCatalog";
import { nexusVar } from "../../utils/theme";

interface Props {
  theme: BookTheme;
  thicknessPx: number;
}

// The book's spine — a thin 3D face hinged at the closed book's left edge,
// carrying the vertical "NEURO NLP NEXUS" / "NLP" (or "DEEP LEARNING")
// label (point 16). Rotated into the book's depth via translateZ/rotateY
// rather than drawn flat, so it reads as a real edge, not a sticker.
export default function BookSpine({ theme, thicknessPx }: Props) {
  return (
    <div
      className="absolute top-0 bottom-0 left-0"
      style={{
        width: thicknessPx,
        transform: `rotateY(90deg) translateZ(${-thicknessPx / 2}px)`,
        transformOrigin: "left center",
        background: `linear-gradient(180deg, ${nexusVar(theme.primary, 0.95)}, ${nexusVar(theme.primary, 0.75)})`,
        boxShadow: "inset 0 0 12px rgba(0,0,0,0.35)",
      }}
      aria-hidden="true"
    >
      <div className="flex h-full w-full items-center justify-center py-4">
        <span
          className="whitespace-pre-line text-center text-[9px] font-semibold uppercase leading-[2.1] tracking-[0.2em]"
          style={{ writingMode: "vertical-rl", color: nexusVar("onGradient") }}
        >
          {`${theme.spineLines[0]}\n${theme.spineLines[1]}`}
        </span>
      </div>
    </div>
  );
}
