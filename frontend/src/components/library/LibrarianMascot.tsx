// The Nexus Library's own small cartoon "librarian" (2026-10-08 user
// request): "create 1 cartoon animation who will act like he is giving
// the book and then the user is opening it, if the cursor is on nlp
// book it will have those color code and if on dl book those acc color
// code resp." Scoped via AskUserQuestion: lives beside the shelf panel
// (not built into the spines themselves), and is a simple geometric/CSS
// mascot built the same way GooglyEyes.tsx already is — plain shapes,
// CSS + framer-motion, no image assets — so it's easy to recolor live
// for whichever domain the student is pointing at and fits this app's
// existing hand-rolled visual style.
//
// Deliberately dumb/stateless: CombinedBookshelf.tsx owns which spine is
// hovered/focused (lifted up from ShelfSpine's own onHoverChange) and
// which one was just clicked, and simply hands both down as props. This
// component never reaches into ShelfSpine/InteractiveBook itself.
import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_SNAPPY } from "../../motion/tokens";
import { nexusVar } from "../../utils/theme";

type BookId = "nlp" | "dl";

interface Props {
  /** Which spine is currently hovered/focused, if any. */
  hovered: BookId | null;
  /** Set the instant a spine is clicked — plays a quick "handing it
   * over" gesture (the held book pulses up/forward) during the brief
   * window before the shelf's own exit transition unmounts this
   * component alongside it (see CombinedBookshelf.tsx's openBook()). */
  activating: BookId | null;
  className?: string;
}

// Same primary accent each book's own theme already uses everywhere
// else in this app (BookTheme.primary in bookCatalog.ts) — never a new
// color introduced here.
const DOMAIN_TOKEN: Record<BookId, "purple" | "gold"> = { nlp: "purple", dl: "gold" };
const DOMAIN_LABEL: Record<BookId, string> = { nlp: "NLP", dl: "Deep Learning" };
// A few degrees of lean toward whichever side the student is pointing
// at — kept small deliberately, matching this Library pass's existing
// "subtle, not a 360 spin" convention (see ShelfSpine.tsx).
const LEAN_DEG: Record<BookId, number> = { nlp: -7, dl: 7 };

export default function LibrarianMascot({ hovered, activating, className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  const focus = activating ?? hovered;
  const bookColor = focus ? nexusVar(DOMAIN_TOKEN[focus]) : nexusVar("muted", 0.5);
  const lean = focus ? LEAN_DEG[focus] : 0;
  const offering = activating !== null;

  return (
    <motion.div
      aria-hidden="true"
      className={`flex select-none flex-col items-center ${className}`}
      style={{ width: 72 }}
      animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
      transition={reduceMotion ? undefined : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={{ rotate: reduceMotion ? 0 : lean }}
        transition={{ duration: DURATION.hover, ease: EASE_SNAPPY }}
      >
        {/* Head */}
        <div
          className="relative h-9 w-9 rounded-full"
          style={{ background: nexusVar("surfaceAlt"), border: `2px solid ${nexusVar("border")}` }}
        >
          <div className="absolute left-[10px] top-[13px] h-1.5 w-1.5 rounded-full" style={{ background: nexusVar("text") }} />
          <div className="absolute right-[10px] top-[13px] h-1.5 w-1.5 rounded-full" style={{ background: nexusVar("text") }} />
          <div
            className="absolute left-1/2 top-[20px] h-[5px] w-3 -translate-x-1/2 rounded-b-full"
            style={{ borderBottom: `2px solid ${nexusVar("text", 0.6)}` }}
          />
        </div>

        {/* Torso, with the book held in both "hands" right at its base —
            so it reads as offered out in front of the body rather than
            floating separately. Recolors to whichever domain is in
            focus; pulses up toward the viewer the instant a spine is
            clicked (the "handing it over" gesture). */}
        <div
          className="-mt-0.5 flex h-9 w-8 items-end justify-center rounded-t-md rounded-b-sm pb-1"
          style={{ background: nexusVar("surface"), border: `2px solid ${nexusVar("border")}`, borderTop: "none" }}
        >
          <motion.div
            className="h-3.5 w-5 rounded-[2px]"
            style={{ background: bookColor, boxShadow: `0 0 10px ${bookColor}` }}
            animate={reduceMotion ? undefined : { y: offering ? -6 : 0, scale: offering ? 1.1 : 1 }}
            transition={{ duration: DURATION.hover, ease: EASE_SNAPPY }}
          />
        </div>
      </motion.div>

      <p className="mt-2 text-center text-[10px] leading-tight text-nexus-muted">
        {focus ? `Here's ${DOMAIN_LABEL[focus]}!` : "Pick a book to begin"}
      </p>
    </motion.div>
  );
}
