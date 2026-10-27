import { ArrowRight } from "lucide-react";

import type { BookAccentToken } from "../../utils/bookAccents";
import { BOOK_ACCENT_CLASSES } from "../../utils/bookAccents";
import type { BookPageFace } from "../../utils/bookPages";
import ContentBlocks from "./ContentBlocks";
import { PAPER_BG, PAPER_BG_SOFT, PAPER_GRAIN_URL, PAPER_INK, PAPER_INK_SOFT } from "./paperTexture";

interface Props {
  face: BookPageFace;
  side: "left" | "right";
  accent: BookAccentToken;
  pageNumber: number;
  /** Only used by the "toc" face kind — jumps straight to a chapter
   * without a page-turn animation, the same way a real book's own table
   * of contents works (you land on the page, you don't watch every page
   * between here and there go by). */
  onJumpToSpread?: (spreadIndex: number, side: "left" | "right") => void;
  /** The book theme's short concept chain (e.g. Token -> Syntax ->
   * Semantics -> Meaning) — reused at small scale on a "chapterOpening"
   * divider page as its one small decorative visual (point 15), rather
   * than inventing separate per-chapter artwork. */
  chainLabels?: string[];
  /** Click-to-turn page corners (point 10): bottom-left advances
   * backward, bottom-right advances forward — only rendered on the side(s)
   * that are genuinely an OUTER corner of what's on screen. On the
   * two-page desktop spread that's the left page's left corner and the
   * right page's right corner only (the two inner corners meet at the
   * spine and never get a hit zone); on mobile's single visible page
   * (singlePage) both corners are genuinely outer, so both are wired. */
  onCornerPrev?: () => void;
  onCornerNext?: () => void;
  singlePage?: boolean;
}

// A single page SURFACE — the paper, its texture, and whatever content
// face it's showing (title / table of contents / a chapter's real
// content blocks). Used both for the two settled page slots and as the
// front/back face content of the flipping leaf in InteractiveBook, so a
// flipped page and a settled page always render identically.
export default function BookPage({
  face,
  side,
  accent,
  pageNumber,
  onJumpToSpread,
  chainLabels,
  onCornerPrev,
  onCornerNext,
  singlePage,
}: Props) {
  const accentClasses = BOOK_ACCENT_CLASSES[accent];
  const isSpineSide = side === "left" ? "right" : "left";

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        side === "left" ? "rounded-l-sm" : "rounded-r-sm"
      }`}
      style={{ backgroundColor: PAPER_BG }}
    >
      {/* Barely-visible paper grain — a tiled, low-alpha noise texture,
          not a flat white/gray fill. */}
      <div
        className="absolute inset-0 opacity-70 mix-blend-multiply"
        style={{ backgroundImage: `url("${PAPER_GRAIN_URL}")`, backgroundSize: "120px 120px" }}
        aria-hidden="true"
      />
      {/* Inner spine shadow — darkest right at the gutter, fading out, plus
          a faint darkening along the outer page edge. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to ${isSpineSide}, rgba(60,45,20,0.16), rgba(60,45,20,0) 14%), linear-gradient(to ${side}, rgba(60,45,20,0.08), rgba(60,45,20,0) 3%)`,
        }}
        aria-hidden="true"
      />
      {/* A touch of extra brightness near the top, like light catching the
          page — subtle, not a gloss effect. */}
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: `linear-gradient(to bottom, ${PAPER_BG_SOFT}, rgba(0,0,0,0) 30%)` }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full flex-col px-[8%] py-[8%]">
        {face.kind === "title" && (
          <div className="flex flex-1 flex-col items-center justify-center text-center gap-4">
            {face.kicker && (
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: PAPER_INK_SOFT }}>
                {face.kicker}
              </p>
            )}
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold leading-snug tracking-tight" style={{ color: PAPER_INK }}>
              {face.heading}
            </h2>
            <span className={`h-px w-16 ${accentClasses.solidBg} opacity-60`} />
            {face.tagline && (
              <p className="max-w-[80%] text-sm italic leading-relaxed" style={{ color: PAPER_INK_SOFT }}>
                {face.tagline}
              </p>
            )}
          </div>
        )}

        {face.kind === "chapterOpening" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <span className={`h-px w-10 ${accentClasses.solidBg} opacity-50`} />
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.25em] ${accentClasses.text}`}
            >
              {face.chapterLabel}
            </p>
            <h2
              className="font-display text-xl sm:text-2xl md:text-3xl font-semibold leading-snug tracking-tight"
              style={{ color: PAPER_INK }}
            >
              {face.heading}
            </h2>
            {face.intro && (
              <p className="max-w-[85%] text-[13px] italic leading-relaxed" style={{ color: PAPER_INK_SOFT }}>
                {face.intro}
              </p>
            )}
            {chainLabels && chainLabels.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
                {chainLabels.map((step, i) => (
                  <span key={step} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight size={9} style={{ color: PAPER_INK_SOFT, opacity: 0.6 }} />}
                    <span className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${accentClasses.text} opacity-80`}>
                      {step}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <span className={`h-px w-10 ${accentClasses.solidBg} opacity-50`} />
          </div>
        )}

        {face.kind === "toc" && (
          <div className="flex h-full flex-col gap-3 overflow-hidden">
            <h2 className="font-display text-base sm:text-lg font-semibold shrink-0" style={{ color: PAPER_INK }}>
              {face.heading}
            </h2>
            <span className={`h-px w-12 shrink-0 ${accentClasses.solidBg} opacity-60`} />
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {face.entries.map((entry) => (
                <button
                  key={entry.chapterId}
                  onClick={() => onJumpToSpread?.(entry.spreadIndex, entry.side)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-1"
                  style={{ color: PAPER_INK }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] ${accentClasses.text}`}>
                      {entry.chapterLabel}
                    </span>
                    <span className="truncate text-[12px]">{entry.title}</span>
                  </span>
                  <ArrowRight size={11} className="shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {face.kind === "chapter" && (
          <div className="flex h-full flex-col gap-2.5 overflow-hidden">
            <div className="shrink-0">
              {face.chapterLabel && (
                <p className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] ${accentClasses.text}`}>
                  {face.chapterLabel}
                  {face.continued && <span className="opacity-60"> (continued)</span>}
                </p>
              )}
              <h2 className="font-display text-base sm:text-lg md:text-xl font-semibold leading-snug mt-0.5" style={{ color: PAPER_INK }}>
                {face.heading}
              </h2>
              <span className={`mt-1.5 block h-px w-12 ${accentClasses.solidBg} opacity-60`} />
              {face.intro && (
                <p className="mt-2 text-[13px] italic leading-relaxed" style={{ color: PAPER_INK_SOFT }}>
                  {face.intro}
                </p>
              )}
            </div>
            {face.blocks.length > 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <ContentBlocks blocks={face.blocks} accent={accent} />
              </div>
            )}
          </div>
        )}

        <p
          className={`mt-2 shrink-0 text-[10px] font-mono tracking-wide ${side === "left" ? "text-left" : "text-right"}`}
          style={{ color: PAPER_INK_SOFT, opacity: 0.7 }}
        >
          {pageNumber}
        </p>
      </div>

      {(singlePage || side === "left") && onCornerPrev && (
        <button
          type="button"
          onClick={onCornerPrev}
          aria-label="Previous page"
          className="absolute bottom-0 left-0 z-[5] h-[14%] w-[12%] cursor-pointer"
        />
      )}
      {(singlePage || side === "right") && onCornerNext && (
        <button
          type="button"
          onClick={onCornerNext}
          aria-label="Next page"
          className="absolute bottom-0 right-0 z-[5] h-[14%] w-[12%] cursor-pointer"
        />
      )}
    </div>
  );
}
