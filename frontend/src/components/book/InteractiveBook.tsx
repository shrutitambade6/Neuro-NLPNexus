import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookMarked } from "lucide-react";

import BookControls from "./BookControls";
import BookCover from "./BookCover";
import BookmarkRibbon from "./BookmarkRibbon";
import BookPage from "./BookPage";
import BookSpine from "./BookSpine";
import PageStack from "./PageStack";
import { PAPER_BG } from "./paperTexture";
import { BOOK_ACCENT_CLASSES } from "../../utils/bookAccents";
import type { BookTheme } from "../../utils/bookCatalog";
import type { BookPageFace } from "../../utils/bookPages";
import { fetchBookProgress, recordBookProgress, type BookProgressSummary } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Props {
  theme: BookTheme;
  // Deep-link target (point 8 of the spec: "Read this concept" buttons on
  // the lab pages must open directly to the exact chapter, never a random
  // book page). Set once from a `?chapter=` URL param by the thin
  // NlpBook.tsx/DlBook.tsx wrapper pages; consumed exactly once on mount
  // via the same pendingResumeRef + openBook() machinery resumeReading()
  // already uses, so a deep link and "Continue reading" share one code
  // path instead of two competing ones.
  initialChapterId?: string;
  // Motion-first Library pass (2026-10-06): when Bookshelf.tsx mounts this
  // after its own shelf-extraction animation, the book should finish that
  // one continuous gesture by opening itself (see the effect below) rather
  // than waiting for a second click right after the student watched it
  // arrive. Never set together with initialChapterId in practice; the
  // effect below favors the deep-link path if it somehow were.
  autoOpen?: boolean;
  // Fired once the book has fully finished closing (cover rotated all the
  // way back shut) — the true end of closeBook()'s animation, not the
  // moment the student clicks Close. Bookshelf.tsx uses this to know when
  // it's safe to animate the book back onto the shelf.
  onClosed?: () => void;
}

const THICKNESS_PX = 22;
const OPEN_DURATION = 0.9; // seconds — spec's "approximate opening animation: 800-1200ms"
const FLIP_DURATION = 0.7;
const EASE: number[] = [0.22, 1, 0.36, 1];

// Captured once, at the moment a flip STARTS -- never re-derived from
// `spreadIndex`/`theme` while it is in flight: the exact outgoing face
// (front of the turning leaf), incoming face (its back, revealed as it
// turns), and the opposite slot's destination content (swapped in
// immediately, since it's fully hidden under the leaf at rotation 0).
// Binding all three to this click-time snapshot -- rather than reading
// them reactively off `spreadIndex`, which only changes once the flip
// commits -- keeps the physical page and its content locked together
// for the whole animation, with nothing left to desync mid-flip.
type FlipState = {
  dir: "next" | "prev";
  target: number;
  outgoingFace: BookPageFace | undefined;
  incomingFace: BookPageFace | undefined;
  revealFace: BookPageFace | undefined;
} | null;

const ZOOM_STEPS = [1, 1.12, 1.26];

// The reusable book engine (point 24): everything about HOW a book opens,
// turns pages, and responds to input lives here. Everything about WHAT a
// given book looks like and contains lives in utils/bookCatalog.ts and is
// passed in as `theme` — NlpBook.tsx / DlBook.tsx are a few lines each.
//
// 3D approach: CSS perspective + transform-style: preserve-3d + rotateY/
// translateZ throughout, per point 5 — no 3D library. The closed book
// (back cover + page-stack + spine + front cover) stays mounted for the
// component's whole lifetime; only the front cover's rotateY animates
// between 0 (closed) and -170deg (open), and the two-page reading spread
// is a separate overlay that fades in once the cover has finished opening
// and fades out (before the cover closes back up) when the student exits.
// This avoids ever having to re-synchronize two independently-animating
// 3D composites mid-transition.
export default function InteractiveBook({ theme, initialChapterId, autoOpen, onClosed }: Props) {
  const reduceMotion = useReducedMotion();
  const accent = BOOK_ACCENT_CLASSES[theme.primary];

  const [isOpen, setIsOpen] = useState(false);
  const [showSpread, setShowSpread] = useState(false);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [flip, setFlip] = useState<FlipState>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileRight, setMobileRight] = useState(false); // single-page mode: left face or right face of the current spread
  const [mobileDir, setMobileDir] = useState<1 | -1>(1);
  const [zoomStep, setZoomStep] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  // Brief cross-fade (point 19) for a Table-of-Contents / deep-link jump
  // to a distant chapter — jumpToSpread below is an instant data swap
  // (never an animated flip through every page in between, which the
  // spec explicitly rules out), but a hard instant cut still reads as a
  // web-page swap rather than a book. This gives it one fast (~150ms)
  // fade instead, skipped entirely under reduced motion.
  const [jumpFlash, setJumpFlash] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Real, server-backed reading progress (point 19) — separate from the
  // per-page localStorage star-bookmark below, which stays a lightweight
  // per-browser convenience. A student with no account session simply
  // never fetches/records this; reading still works with no backend.
  const [progressSummary, setProgressSummary] = useState<BookProgressSummary | null>(null);
  const pendingResumeRef = useRef<{ spreadIndex: number; side: "left" | "right" } | null>(null);
  const token = useAuthStore((s) => s.token);
  // Bug fix (2026-10-07 user feedback): the cover's rotateY motion.div
  // below shares ONE onAnimationComplete handler for both "finished
  // opening" and "finished closing". On first mount, before the book
  // has ever been opened, its animate target is already the closed
  // pose (isOpen starts false) -- Framer Motion still resolves that
  // trivial no-op animation and fires onAnimationComplete for it, which
  // used to hit the "closed" branch and call onClosed() immediately,
  // bouncing Bookshelf.tsx straight back to the shelf before autoOpen's
  // timer ever got to actually open the book. This ref distinguishes a
  // genuine close (book was opened at least once) from that spurious
  // mount-time completion.
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setProgressSummary(null);
      return;
    }
    fetchBookProgress(theme.id)
      .then(setProgressSummary)
      .catch(() => setProgressSummary(null));
  }, [theme.id, token]);

  const resumeEntry = useMemo(
    () => theme.toc.find((e) => e.chapterId === progressSummary?.resume_chapter_id) ?? null,
    [theme.toc, progressSummary],
  );

  const totalSpreads = theme.spreads.length;
  const totalPages = totalSpreads * 2;

  // Two-page spread at tablet width and up; a single page at a time below
  // it (point 18) — animation kept, just one leaf instead of two slots.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMobile(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // This specific per-PAGE star stays a per-browser localStorage
  // convenience, deliberately coarser-grained than the real, server-backed
  // per-CHAPTER reading progress above — bookmarking an exact page you
  // were on is a quick personal marker, not account-level state worth a
  // round trip for every click.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`neuronlp-nexus-book-bookmarks-${theme.id}`);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      /* non-critical */
    }
  }, [theme.id]);

  const flatIndex = spreadIndex * 2 + (mobileRight ? 1 : 0);
  const currentPageIndex = isMobile ? flatIndex : spreadIndex * 2; // for bookmarking/labeling

  const toggleBookmark = useCallback(() => {
    const next = bookmarks.includes(currentPageIndex)
      ? bookmarks.filter((p) => p !== currentPageIndex)
      : [...bookmarks, currentPageIndex];
    setBookmarks(next);
    try {
      localStorage.setItem(`neuronlp-nexus-book-bookmarks-${theme.id}`, JSON.stringify(next));
    } catch {
      /* non-critical */
    }
  }, [bookmarks, currentPageIndex, theme.id]);

  const openBook = useCallback(() => {
    if (isOpen) return;
    hasOpenedRef.current = true;
    setIsOpen(true);
    if (reduceMotion) setShowSpread(true);
  }, [isOpen, reduceMotion]);

  const closeBook = useCallback(() => {
    if (!isOpen) return;
    setImmersive(false);
    if (reduceMotion) {
      setShowSpread(false);
      setIsOpen(false);
      return;
    }
    setShowSpread(false); // cover closes once the spread finishes fading (onExitComplete below)
  }, [isOpen, reduceMotion]);

  const goNext = useCallback(() => {
    if (flip || !showSpread) return;
    if (isMobile) {
      if (flatIndex + 1 >= totalPages) return;
      setMobileDir(1);
      if (!mobileRight) {
        setMobileRight(true);
      } else {
        setSpreadIndex((i) => i + 1);
        setMobileRight(false);
      }
      return;
    }
    if (spreadIndex >= totalSpreads - 1) return;
    const target = spreadIndex + 1;
    setFlip({
      dir: "next",
      target,
      outgoingFace: theme.spreads[spreadIndex]?.right,
      incomingFace: theme.spreads[target]?.left,
      revealFace: theme.spreads[target]?.right,
    });
  }, [flip, showSpread, isMobile, flatIndex, totalPages, mobileRight, spreadIndex, totalSpreads, theme]);

  const goPrev = useCallback(() => {
    if (flip || !showSpread) return;
    if (isMobile) {
      if (flatIndex === 0) return;
      setMobileDir(-1);
      if (mobileRight) {
        setMobileRight(false);
      } else {
        setSpreadIndex((i) => i - 1);
        setMobileRight(true);
      }
      return;
    }
    if (spreadIndex === 0) return;
    const target = spreadIndex - 1;
    setFlip({
      dir: "prev",
      target,
      outgoingFace: theme.spreads[spreadIndex]?.left,
      incomingFace: theme.spreads[target]?.right,
      revealFace: theme.spreads[target]?.left,
    });
  }, [flip, showSpread, isMobile, flatIndex, mobileRight, spreadIndex, theme]);

  // Table-of-contents navigation: an instant jump to the exact chapter
  // clicked, never an animated flip through every page in between (point
  // 8 of the spec: "it should deep-link to the exact relevant topic").
  const jumpToSpread = useCallback(
    (targetSpread: number, targetSide: "left" | "right") => {
      if (flip) return;
      if (!reduceMotion && !isMobile) {
        setJumpFlash(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setJumpFlash(false)));
      }
      setSpreadIndex(targetSpread);
      if (isMobile) setMobileRight(targetSide === "right");
    },
    [flip, isMobile, reduceMotion],
  );

  // Resume reading: once the cover animation has finished opening and the
  // spread is actually showing, jump straight to wherever the student
  // left off — set by resumeReading() below, right before it calls
  // openBook(). A plain "Open {book}" click never sets this ref, so a
  // fresh open always starts at the title page as before.
  useEffect(() => {
    if (showSpread && pendingResumeRef.current) {
      const { spreadIndex: targetSpread, side } = pendingResumeRef.current;
      pendingResumeRef.current = null;
      jumpToSpread(targetSpread, side);
    }
  }, [showSpread, jumpToSpread]);

  const resumeReading = useCallback(() => {
    if (resumeEntry) pendingResumeRef.current = { spreadIndex: resumeEntry.spreadIndex, side: resumeEntry.side };
    openBook();
  }, [resumeEntry, openBook]);

  // Deep-link open: if a lab page sent us here with a specific chapter in
  // mind, open straight to it — once, on mount. Deliberately independent
  // of auth/progress (unlike resumeReading above): a "Read this concept"
  // link works for a signed-out visitor exactly the same as a signed-in
  // student, since it's just a table-of-contents jump, not a resume.
  const consumedInitialChapterRef = useRef(false);
  useEffect(() => {
    if (consumedInitialChapterRef.current || !initialChapterId) return;
    const entry = theme.toc.find((e) => e.chapterId === initialChapterId);
    if (!entry) return;
    consumedInitialChapterRef.current = true;
    pendingResumeRef.current = { spreadIndex: entry.spreadIndex, side: entry.side };
    openBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChapterId, theme, openBook]);

  // Auto-open on mount (motion-first Library pass, 2026-10-06) — see the
  // autoOpen prop's doc comment above. A short delay lets the wrapper's own
  // "book arriving from the shelf" entrance motion read as one continuous
  // gesture with the cover opening, rather than the cover starting to swing
  // open mid-flight; skipped entirely under reduced motion.
  const consumedAutoOpenRef = useRef(false);
  useEffect(() => {
    if (consumedAutoOpenRef.current || !autoOpen || initialChapterId) return;
    consumedAutoOpenRef.current = true;
    const delay = reduceMotion ? 0 : 350;
    const t = window.setTimeout(() => openBook(), delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, initialChapterId, openBook, reduceMotion]);

  // Records real reading progress once a page settles (never mid-flip,
  // never for the title/TOC faces, never for the "__end__" padding page a
  // book gets if its page count is odd) — a chapter counts as completed
  // the moment its own last page is reached, not from a time-on-page
  // guess. Fires again harmlessly on a re-render with the same settled
  // page; the backend upsert this calls is idempotent either way.
  useEffect(() => {
    if (!showSpread || flip || !token) return;
    const spread = theme.spreads[spreadIndex];
    if (!spread) return;
    const faces = isMobile ? [mobileRight ? spread.right : spread.left] : [spread.left, spread.right];
    faces.forEach((face) => {
      if (!face || face.kind !== "chapter" || face.chapterId === "__end__") return;
      const completed = face.pageInChapter === face.totalPagesInChapter - 1;
      recordBookProgress(theme.id, face.chapterId, completed, face.pageInChapter).catch(() => {
        /* non-critical — reading works locally even if this one call fails */
      });
    });
  }, [theme, spreadIndex, mobileRight, isMobile, showSpread, flip, token]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (immersive) setImmersive(false);
        else if (isOpen) closeBook();
        return;
      }
      if (!showSpread) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [immersive, isOpen, showSpread, goNext, goPrev, closeBook]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion || isOpen) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: py * -8, y: px * 10 });
    },
    [reduceMotion, isOpen],
  );
  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  // Page-number labels only -- plain index math. Content comes from the
  // captured `flip` fields below, never from re-reading `theme`/
  // `spreadIndex` mid-flight.
  const leftSpread = flip?.dir === "prev" ? flip.target : spreadIndex;
  const rightSpread = flip?.dir === "next" ? flip.target : spreadIndex;
  // The slot the leaf's back face is about to reveal shows the content
  // captured in `flip.revealFace` from the instant the flip started
  // (it's fully hidden under the leaf at rotation 0, so there's no
  // visible pop); the other slot keeps its own current, settled content
  // unchanged until the flip commits.
  const leftFace = flip?.dir === "prev" ? flip.revealFace : theme.spreads[spreadIndex]?.left;
  const rightFace = flip?.dir === "next" ? flip.revealFace : theme.spreads[spreadIndex]?.right;

  const leafFront = flip ? flip.outgoingFace : null;
  const leafBack = flip ? flip.incomingFace : null;

  const mobileFace = mobileRight ? theme.spreads[spreadIndex]?.right : theme.spreads[spreadIndex]?.left;

  const pageLabel = useMemo(() => {
    if (isMobile) return `Page ${flatIndex + 1} of ${totalPages}`;
    return `Page ${spreadIndex * 2 + 1}–${spreadIndex * 2 + 2} of ${totalPages}`;
  }, [isMobile, flatIndex, totalPages, spreadIndex]);

  // Which page the physical ribbon (point 21) hangs over, if the page
  // currently showing is bookmarked — mirrors currentPageIndex exactly
  // (desktop always bookmarks the spread's left page; see that constant
  // above), so the ribbon and the Bookmark button in BookControls always
  // agree about which page is marked.
  const ribbonSide: "left" | "right" = isMobile ? (mobileRight ? "right" : "left") : "left";
  const showRibbon = !flip && showSpread && bookmarks.includes(currentPageIndex);

  const canPrev = showSpread && !flip && (isMobile ? flatIndex > 0 : spreadIndex > 0);
  const canNext = showSpread && !flip && (isMobile ? flatIndex + 1 < totalPages : spreadIndex < totalSpreads - 1);
  // "Return to index" (2026-10-08): the TOC page is always spread 0,
  // right side (bookPages.ts's buildBookSpreads fixes flat index 1 ==
  // TOC) -- on desktop both faces of spread 0 show at once, so simply
  // being on spread 0 means the TOC is visible; on mobile only the
  // right-side single page is the TOC itself.
  const atContents = showSpread && !flip && spreadIndex === 0 && (!isMobile || mobileRight);

  return (
    <div
      className={
        immersive
          ? "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-nexus-bg/97 backdrop-blur-sm px-4 py-8"
          : "flex flex-col items-center gap-6"
      }
    >
      {/* Ground shadow — widens and softens once open (point 12).
          This whole closed-book composite (shadow + cover/spine/page-
          stack) stays MOUNTED at all times so its rotateY/scale motion
          values animate smoothly in both directions, but it is display:
          none the instant the reading spread is actually showing.
          Without this, the composite keeps occupying its layout slot
          while the cover sits rotated open (front cover rotateY ~-170deg
          reveals the plain paper-colored underside, net-facing the
          viewer) — a second, blank "open book" rendered right above the
          real content spread below it. */}
      <div
        className="relative w-full flex justify-center"
        style={{ perspective: 2400, display: showSpread ? "none" : undefined }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full bg-black/50 blur-2xl"
          style={{ bottom: isMobile ? -18 : -26, height: 28 }}
          animate={{ width: isOpen ? (isMobile ? 220 : 520) : isMobile ? 160 : 260, opacity: isOpen ? 0.35 : 0.45 }}
          transition={{ duration: reduceMotion ? 0 : 0.4 }}
        />

        {/* Closed-book composite: always mounted, never unmounted, so the
            front cover's rotateY can animate smoothly in BOTH directions
            from a single persistent motion value instead of remounting. */}
        <motion.div
          className="relative cursor-pointer select-none"
          style={{
            width: isMobile ? "min(70vw, 230px)" : "min(42vw, 300px)",
            aspectRatio: "7 / 10",
            transformStyle: "preserve-3d",
          }}
          animate={{
            y: isOpen ? -10 : tilt.x,
            rotateX: isOpen ? 0 : tilt.x * 0.4,
            rotateY: isOpen ? -24 : tilt.y,
            scale: isOpen ? 1.01 : 1,
          }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE }}
          onMouseMove={handleMouseMove}
          onMouseLeave={resetTilt}
          onClick={openBook}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openBook();
            }
          }}
          role="button"
          tabIndex={isOpen ? -1 : 0}
          aria-label={`Open ${theme.subtitle}`}
          aria-hidden={showSpread}
        >
          <BookSpine theme={theme} thicknessPx={THICKNESS_PX} />
          <div className="absolute inset-0" style={{ transform: `translateZ(-${THICKNESS_PX}px)` }}>
            <BookCover theme={theme} face="back" />
          </div>
          <PageStack thicknessPx={THICKNESS_PX} />
          <motion.div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", transformOrigin: "0% 50%" }}
            animate={{
              rotateY: isOpen ? -170 : 0,
              z: 2,
              boxShadow: isOpen ? "6px 0 24px rgba(0,0,0,0.35)" : "0 10px 30px rgba(0,0,0,0.4)",
            }}
            transition={{ duration: reduceMotion ? 0 : OPEN_DURATION, delay: reduceMotion ? 0 : isOpen ? 0.12 : 0, ease: EASE }}
            onAnimationComplete={() => {
              if (isOpen) setShowSpread(true);
              else if (hasOpenedRef.current) {
                // A genuine close: the book was actually open at some
                // point before this. Never true on first mount, which
                // is exactly the spurious case this guards against.
                setIsOpen(false);
                onClosed?.();
              }
            }}
          >
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
              <BookCover theme={theme} face="front" />
            </div>
            <div
              className="absolute inset-0 rounded-l-md"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", backgroundColor: PAPER_BG }}
            />
          </motion.div>
        </motion.div>
      </div>

      {!showSpread && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={openBook}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${accent.border} ${accent.bgSoft} ${accent.text} ${accent.hoverBgSofter}`}
          >
            Open {theme.openLabel} <ArrowRight size={14} />
          </button>
          {progressSummary && progressSummary.completed_chapters > 0 && (
            <button
              onClick={resumeReading}
              className="inline-flex items-center gap-1.5 text-xs text-nexus-muted hover:text-nexus-text"
            >
              <BookMarked size={12} />
              {progressSummary.percentage}% complete
              {resumeEntry && <> · Continue: {resumeEntry.chapterLabel} — {resumeEntry.title}</>}
            </button>
          )}
        </div>
      )}

      {/* Reading spread — mounted once the cover has finished opening,
          unmounted (fading out first) when the student closes the book. */}
      <AnimatePresence onExitComplete={() => setIsOpen(false)}>
        {showSpread && (
          <motion.div
            key="spread"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? {} : { opacity: 0, scale: 0.97 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <div
              className="relative mx-auto"
              style={{
                perspective: 2600,
                width: isMobile ? "min(82vw, 320px)" : "min(88vw, 820px)",
                aspectRatio: isMobile ? "7 / 10" : "16 / 11",
                transform: `scale(${ZOOM_STEPS[zoomStep]})`,
                transformOrigin: "top center",
              }}
            >
              <div
                className="relative flex h-full w-full overflow-hidden rounded-md shadow-2xl"
                style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)" }}
              >
                {showRibbon && <BookmarkRibbon accent={theme.primary} side={ribbonSide} />}
                {isMobile ? (
                  <AnimatePresence initial={false} custom={mobileDir} mode="popLayout">
                    <motion.div
                      key={flatIndex}
                      custom={mobileDir}
                      initial={reduceMotion ? false : { rotateY: mobileDir * 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={reduceMotion ? {} : { rotateY: mobileDir * -90, opacity: 0 }}
                      transition={{ duration: reduceMotion ? 0 : FLIP_DURATION, ease: EASE }}
                      style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}
                    >
                      {mobileFace && (
                        <BookPage
                          face={mobileFace}
                          side={mobileRight ? "right" : "left"}
                          accent={theme.primary}
                          pageNumber={flatIndex + 1}
                          onJumpToSpread={jumpToSpread}
                          chainLabels={theme.chain}
                          singlePage
                          onCornerPrev={canPrev ? goPrev : undefined}
                          onCornerNext={canNext ? goNext : undefined}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 flex transition-opacity duration-150 ${jumpFlash ? "opacity-0" : "opacity-100"}`}
                    >
                    <div className="relative h-full w-1/2 border-r border-black/10">
                      {leftFace && (
                        <BookPage
                          face={leftFace}
                          side="left"
                          accent={theme.primary}
                          pageNumber={leftSpread * 2 + 1}
                          onJumpToSpread={jumpToSpread}
                          chainLabels={theme.chain}
                          onCornerPrev={canPrev ? goPrev : undefined}
                        />
                      )}
                    </div>
                    <div className="relative h-full w-1/2">
                      {rightFace && (
                        <BookPage
                          face={rightFace}
                          side="right"
                          accent={theme.primary}
                          pageNumber={rightSpread * 2 + 2}
                          onJumpToSpread={jumpToSpread}
                          chainLabels={theme.chain}
                          onCornerNext={canNext ? goNext : undefined}
                        />
                      )}
                    </div>
                    </div>

                    {/* The turning leaf. No AnimatePresence/exit phase
                        here -- there is nothing meaningful left to show
                        once the forward rotation finishes, since the
                        underlying left/right slots above already match
                        flip.target by the time onAnimationComplete fires
                        (same state update, same render), so the leaf can
                        simply unmount the instant flip is cleared with
                        zero visible gap. A single onAnimationComplete is
                        now the ONLY place that commits spreadIndex and
                        clears flip -- removing the previous second
                        (onExitComplete) writer, whose own exit animation
                        always targeted the rotation the leaf had already
                        reached, closes off any chance of the two racing
                        or double-firing. */}
                    {flip && (
                      <motion.div
                        key={`flip-${flip.dir}-${flip.target}`}
                        className="absolute top-0 bottom-0"
                        style={{
                          left: flip.dir === "next" ? "50%" : 0,
                          width: "50%",
                          transformStyle: "preserve-3d",
                          transformOrigin: flip.dir === "next" ? "0% 50%" : "100% 50%",
                        }}
                        initial={{ rotateY: 0 }}
                        animate={{ rotateY: flip.dir === "next" ? -176 : 176 }}
                        transition={{ duration: reduceMotion ? 0 : FLIP_DURATION, ease: EASE }}
                        onAnimationComplete={() => {
                          setSpreadIndex(flip.target);
                          setFlip(null);
                        }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{ backfaceVisibility: "hidden", boxShadow: "0 0 24px rgba(0,0,0,0.25)" }}
                        >
                          {leafFront && (
                            <BookPage
                              face={leafFront}
                              side={flip.dir === "next" ? "right" : "left"}
                              accent={theme.primary}
                              pageNumber={spreadIndex * 2 + (flip.dir === "next" ? 2 : 1)}
                              chainLabels={theme.chain}
                            />
                          )}
                        </div>
                        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                          {leafBack && (
                            <BookPage
                              face={leafBack}
                              side={flip.dir === "next" ? "left" : "right"}
                              accent={theme.primary}
                              pageNumber={flip.target * 2 + (flip.dir === "next" ? 1 : 2)}
                              chainLabels={theme.chain}
                            />
                          )}
                        </div>
                        {/* Shading sweep during the turn (point 9) -- a soft
                            shadow that peaks mid-flip rather than a flat
                            opacity cross-fade. */}
                        <motion.div
                          className="absolute inset-0 bg-black pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.3, 0] }}
                          transition={{ duration: reduceMotion ? 0 : FLIP_DURATION, times: [0, 0.5, 1] }}
                        />
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </div>

            <BookControls
              accent={theme.primary}
              pageLabel={pageLabel}
              progressLabel={progressSummary ? `${progressSummary.percentage}% read` : undefined}
              canPrev={canPrev}
              canNext={canNext}
              onPrev={goPrev}
              onNext={goNext}
              bookmarked={bookmarks.includes(currentPageIndex)}
              onToggleBookmark={toggleBookmark}
              onContents={() => jumpToSpread(0, "right")}
              atContents={atContents}
              zoomLabel={`${Math.round(ZOOM_STEPS[zoomStep] * 100)}%`}
              onToggleZoom={() => setZoomStep((z) => (z + 1) % ZOOM_STEPS.length)}
              immersive={immersive}
              onToggleImmersive={() => setImmersive((v) => !v)}
              onClose={closeBook}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
