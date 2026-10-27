import type { BookAccentToken } from "../../utils/bookAccents";
import { BOOK_ACCENT_CLASSES } from "../../utils/bookAccents";

interface Props {
  accent: BookAccentToken;
  /** Which half of the open spread to hang over — the same page the
   * Bookmark button in BookControls just marked (see InteractiveBook's
   * currentPageIndex). */
  side: "left" | "right";
}

// The physical ribbon-bookmark the spec asks for (point 21) — a small
// colored strip hanging over the top edge of the bookmarked page, cut to
// a V at the bottom like a real cloth bookmark, rather than just the
// Bookmark button in BookControls being the only visible sign a page is
// marked. Purely decorative/visual; BookControls' button stays the real,
// clickable toggle — this is its on-page reflection.
export default function BookmarkRibbon({ accent, side }: Props) {
  const accentClasses = BOOK_ACCENT_CLASSES[accent];
  return (
    <div
      className={`pointer-events-none absolute -top-2 z-20 h-9 w-5 ${accentClasses.solidBg} ${
        side === "left" ? "left-[14%]" : "right-[14%]"
      }`}
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)",
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))",
      }}
      aria-hidden="true"
    />
  );
}
