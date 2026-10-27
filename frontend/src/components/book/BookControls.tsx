import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, List, Maximize2, Minimize2, X, ZoomIn } from "lucide-react";

import type { BookAccentToken } from "../../utils/bookAccents";
import { BOOK_ACCENT_CLASSES } from "../../utils/bookAccents";

interface Props {
  accent: BookAccentToken;
  pageLabel: string;
  /** Real, server-backed "N% read" (point 20) — undefined for a
   * signed-out visitor or before progress has loaded, in which case
   * nothing is shown rather than a fake/guessed percentage. */
  progressLabel?: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  // "Return to index" (2026-10-08 user request): a reader deep inside a
  // chapter can jump straight back to the book's own Table of Contents
  // page (always spread 0, right side -- see bookPages.ts's
  // buildBookSpreads) without flipping back through every intervening
  // page, reusing the same instant jumpToSpread + cross-fade mechanism
  // the TOC page's own chapter links already use.
  onContents: () => void;
  /** True while the TOC page is the one currently showing -- disables
   * the button rather than letting it re-"jump" to where the reader
   * already is. */
  atContents: boolean;
  zoomLabel: string;
  onToggleZoom: () => void;
  immersive: boolean;
  onToggleImmersive: () => void;
  onClose: () => void;
}

// Minimal control strip below the open spread (point 13). Every control is
// genuinely wired up — Previous/Next drive the real page-turn animation in
// InteractiveBook, Bookmark/Zoom/Fullscreen all do something real — rather
// than decorative buttons with no behavior behind them.
export default function BookControls({
  accent,
  pageLabel,
  progressLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  bookmarked,
  onToggleBookmark,
  onContents,
  atContents,
  zoomLabel,
  onToggleZoom,
  immersive,
  onToggleImmersive,
  onClose,
}: Props) {
  const accentClasses = BOOK_ACCENT_CLASSES[accent];

  return (
    <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-3 text-sm">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-3 py-1.5 text-nexus-muted transition-colors hover:text-nexus-text hover:border-nexus-accentDim disabled:opacity-40 disabled:hover:text-nexus-muted disabled:hover:border-nexus-border"
      >
        <ChevronLeft size={15} /> Previous Page
      </button>

      <p className="font-mono text-xs text-nexus-muted">
        {pageLabel}
        {progressLabel && <span className="opacity-70"> · {progressLabel}</span>}
      </p>

      <button
        onClick={onNext}
        disabled={!canNext}
        className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-3 py-1.5 text-nexus-muted transition-colors hover:text-nexus-text hover:border-nexus-accentDim disabled:opacity-40 disabled:hover:text-nexus-muted disabled:hover:border-nexus-border"
      >
        Next Page <ChevronRight size={15} />
      </button>

      <div className="flex w-full items-center justify-center gap-2 pt-1">
        <button
          onClick={onToggleBookmark}
          title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
            bookmarked
              ? `${accentClasses.border} ${accentClasses.bgSoft} ${accentClasses.text}`
              : "border-nexus-border bg-nexus-surface text-nexus-muted hover:text-nexus-text"
          }`}
        >
          {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          Bookmark
        </button>

        <button
          onClick={onContents}
          disabled={atContents}
          title={atContents ? "Already at Contents" : "Jump to Table of Contents"}
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-2.5 py-1.5 text-xs text-nexus-muted transition-colors hover:text-nexus-text disabled:opacity-40 disabled:hover:text-nexus-muted"
        >
          <List size={14} /> Contents
        </button>

        <button
          onClick={onToggleZoom}
          title="Cycle zoom level"
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-2.5 py-1.5 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
        >
          <ZoomIn size={14} /> {zoomLabel}
        </button>

        <button
          onClick={onToggleImmersive}
          title={immersive ? "Exit fullscreen" : "Fullscreen"}
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-2.5 py-1.5 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
        >
          {immersive ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {immersive ? "Exit" : "Fullscreen"}
        </button>

        <button
          onClick={onClose}
          title="Close book"
          className="flex items-center gap-1.5 rounded-lg border border-nexus-border bg-nexus-surface px-2.5 py-1.5 text-xs text-nexus-muted transition-colors hover:text-nexus-text"
        >
          <X size={14} /> Close
        </button>
      </div>
    </div>
  );
}
