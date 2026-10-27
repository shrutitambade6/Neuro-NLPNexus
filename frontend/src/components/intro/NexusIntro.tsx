import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { NEXUS_CONCEPTS } from "../../data/nexusConcepts";

// NeuroNLP Nexus — Opening Experience + Universe Reveal (storytelling-UI
// spec, 2026-10-07, sections 1/2/15/16). First deliverable of that much
// larger spec, scoped down deliberately (confirmed with the user via
// AskUserQuestion before building): just the cinematic intro, the
// NLP x DL reveal transition, and the "skip / remember you've seen it"
// logic -- not the nine narrative chapters the full spec also describes
// (those touch the Library/Playground/Concept DNA/etc. pages themselves
// and are explicitly follow-up work). Mounted ONLY from Home.tsx (the
// public landing page, "/"), and only when the viewer hasn't seen it
// before -- see the localStorage flag below. Everything after this
// component hands off (onComplete) is the EXISTING, untouched Home page
// and app -- this never replaces or forks any real functionality, exactly
// per section 21's "do not rebuild the website from scratch" instruction.
//
// Fixed literal "deep space" colors are used throughout (never the
// theme-reactive nexus-* CSS variables) -- same convention already
// established for HeroNeuralField's canvas PALETTE and
// NexusSolarSystem's backdrop/stars: this scene must look like deep space
// regardless of the site's light/dark theme setting, the same reason
// those two components made the same choice. Values are the user's own
// spec (section 19), which already matches what this app's dark-theme
// tokens resolve to almost exactly (nexus-purple dark IS #A78BFA, nexus-
// accent dark IS #1687FF) -- so this intro is visually continuous with
// the rest of the app's "deep space" visual language, not a new palette.
const COLOR = {
  bgOuter: "#050B1C",
  bgInner: "#07152F",
  nlp: "#A78BFA",
  nlpDim: "#8B5CF6",
  dl: "#FBBF24",
  dlDim: "#F59E0B",
  nexus: "#1687FF",
  nexusDim: "#38BDF8",
  text: "#E8EEF8",
  muted: "#A8B4C7",
} as const;

// Floating topic captions (2026-10-07 follow-up) -- the opening scene's
// background used to be this app's own CSS/SVG starfield + orbital rings
// (RING_PLANETS, removed below); the user asked to replace that with the
// attached cinematic video instead, and to still carry NLP/DL topic
// identity over it. That video is generic AI-generated space art with a
// free-flying camera -- there's no way to track or pin a label to any
// specific planet in it frame-by-frame, confirmed with the user via
// AskUserQuestion, who chose floating captions that aren't pinned to any
// particular planet over attempting that. So this is a deliberately
// different technique from RING_PLANETS: real topic names (pulled from
// NEXUS_CONCEPTS, the exact same data the Home hero's interactive solar
// system uses -- never invented text) fading in and out at fixed screen
// positions chosen to stay clear of the centered title/button content,
// looping on roughly the video's own ~10s cycle.
const CAPTION_IDS = [
  "transformers",
  "embeddings",
  "deep-learning",
  "syntax-parsing",
  "neural-networks",
  "text-preprocessing",
  "rnn-lstm",
  "semantic-understanding",
  "generative-ai",
] as const;

const CAPTION_POSITIONS: ReadonlyArray<{ top: string; left?: string; right?: string }> = [
  { top: "12%", left: "7%" },
  { top: "16%", right: "9%" },
  { top: "42%", right: "6%" },
  { top: "46%", left: "5%" },
  { top: "83%", right: "10%" },
  { top: "85%", left: "8%" },
  { top: "8%", right: "28%" },
  { top: "90%", left: "32%" },
  { top: "66%", right: "7%" },
];

function domainColor(domain: "nlp" | "dl" | "intersection"): string {
  if (domain === "nlp") return COLOR.nlp;
  if (domain === "dl") return COLOR.dl;
  return COLOR.nexus;
}

const FLOATING_CAPTIONS = CAPTION_IDS.map((id, i) => {
  const concept = NEXUS_CONCEPTS.find((c) => c.id === id);
  // Every id above is a real, current NEXUS_CONCEPTS entry (verified
  // against data/nexusConcepts.ts while writing this list) -- the
  // fallback below only guards against that list changing out from under
  // this one later, so a typo'd/removed id degrades to a blank caption
  // slot instead of a crash.
  return {
    label: concept?.short ?? "",
    color: domainColor(concept?.domain ?? "intersection"),
    position: CAPTION_POSITIONS[i],
    delay: i * 1.05,
  };
});

export const NEXUS_INTRO_SEEN_KEY = "neuronlp-nexus-intro-seen";

export function hasSeenNexusIntro(): boolean {
  // 2026-10-08: always treat the intro as unseen while running the local
  // dev server (`npm run dev` -- Vite sets import.meta.env.DEV true).
  // The user's own earlier local testing had already marked it "seen" in
  // their regular browser profile, which made the production-correct
  // "remember once seen, don't replay on every visit" behavior look like
  // a bug ("I can't see it on the normal page anymore, only in a private
  // window / with a URL trick"). This restores the plain "/" URL to
  // showing the intro on every reload while developing -- exactly how it
  // behaved the first time, before anything had ever been marked seen --
  // without touching the real one-time behavior a genuine production
  // build (import.meta.env.DEV false) still gets for real visitors.
  if (import.meta.env.DEV) return false;
  try {
    return window.localStorage.getItem(NEXUS_INTRO_SEEN_KEY) === "1";
  } catch {
    // localStorage unavailable (private mode, etc.) -- never block the
    // real app on this; just always show the (short, skippable) intro.
    return false;
  }
}

function markNexusIntroSeen() {
  try {
    window.localStorage.setItem(NEXUS_INTRO_SEEN_KEY, "1");
  } catch {
    // Nothing to persist to -- the intro will simply play again next
    // visit, which is a harmless degradation, not a broken feature.
  }
}

type Stage = "opening" | "reveal";

export default function NexusIntro({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("opening");
  const [exiting, setExiting] = useState(false);
  // Guards against finish() running twice -- e.g. the reveal stage's own
  // auto-advance timer firing after the user already clicked Skip
  // manually (the component stays mounted for the ~420ms exit animation,
  // so that timer can still be pending). Harmless either way (every step
  // inside is idempotent) but this keeps it from calling onComplete twice.
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markNexusIntroSeen();
    setExiting(true);
    window.setTimeout(onComplete, reduceMotion ? 0 : 420);
  };

  const enterReveal = () => {
    markNexusIntroSeen();
    setStage("reveal");
  };

  // Section 2's reveal auto-resolves into the real app a short beat after
  // it finishes animating in -- there's no second button here, matching
  // the spec ("use a smooth transition into the main application"). Skip
  // still works throughout.
  useEffect(() => {
    if (stage !== "reveal") return;
    const t = window.setTimeout(finish, reduceMotion ? 300 : 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, reduceMotion]);

  // Escape always skips -- same "skippable at any point" guarantee as the
  // visible Skip link, for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="NeuroNLP Nexus introduction"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-6"
          style={{
            background: `radial-gradient(ellipse at 50% 40%, ${COLOR.bgInner} 0%, ${COLOR.bgOuter} 70%)`,
          }}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: reduceMotion ? 1 : 1.03 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.42, ease: "easeInOut" }}
        >
          {/* Background scene (2026-10-08 -- replaces the old CSS
              starfield + orbital rings per explicit user request): the
              user's own 10s AI-generated space-flythrough video, looping
              behind the whole dialog -- both stages, same as the
              starfield/rings it replaces were visible behind both.
              muted+playsInline is required for autoplay to actually run
              in every browser, not a stylistic choice; loop keeps it
              going for however long the visitor takes to read and click
              "Enter the Nexus". If the file ever fails to load, the
              wrapper's own radial-gradient background (above) still
              shows through underneath -- never a blank/broken frame. */}
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            src="/videos/nexus-intro.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />

          {/* Scrim -- the video's own colors run bright/saturated, which
              would fight the white title/body text for attention and
              hurt contrast; this tints it back toward the same deep-space
              palette (COLOR.bgInner/bgOuter) the rest of this component
              and the app's dark theme already use, so the video reads as
              "this app's universe" rather than a pasted-in clip. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, ${COLOR.bgInner}59 0%, ${COLOR.bgOuter}bf 75%)`,
            }}
          />

          {/* Floating NLP/DL topic captions -- see FLOATING_CAPTIONS'
              own comment above for why these aren't pinned to specific
              planets in the video. Hidden under reduced motion, same as
              the rings they replace were. */}
          {!reduceMotion && (
            <div className="pointer-events-none absolute inset-0">
              {FLOATING_CAPTIONS.map((caption, i) => (
                <motion.div
                  key={i}
                  className="absolute flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] sm:text-xs"
                  style={{ top: caption.position.top, left: caption.position.left, right: caption.position.right, color: COLOR.muted }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{
                    duration: 2.6,
                    times: [0, 0.18, 0.82, 1],
                    delay: caption.delay,
                    repeat: Infinity,
                    repeatDelay: CAPTION_IDS.length * 1.05 - 2.6,
                    ease: "easeInOut",
                  }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: caption.color, boxShadow: `0 0 6px ${caption.color}` }}
                  />
                  {caption.label}
                </motion.div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {stage === "opening" ? (
              <OpeningScene key="opening" reduceMotion={!!reduceMotion} onEnter={enterReveal} />
            ) : (
              <RevealScene key="reveal" reduceMotion={!!reduceMotion} />
            )}
          </AnimatePresence>

          {/* Skip -- always present, both stages, per the spec's explicit
              "do not create a long intro that annoys returning users". */}
          <button
            onClick={finish}
            className="absolute bottom-5 right-5 z-10 text-xs font-medium text-[color:var(--nexus-intro-muted)] underline-offset-4 hover:underline"
            style={{ color: COLOR.muted }}
          >
            Skip intro →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OpeningScene({
  reduceMotion,
  onEnter,
}: {
  reduceMotion: boolean;
  onEnter: () => void;
}) {
  // Sequential reveal via staggered entrance delays rather than a timer
  // state machine -- simpler, and every line is still independently
  // skippable at any moment via the always-present Skip control. Under
  // reduced motion everything appears together, instantly (no stagger),
  // per this project's "replace complex transitions with simple fades"
  // convention.
  const base = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0.2 : 0.6, delay: reduceMotion ? 0 : delay, ease: "easeOut" },
  });

  return (
    <motion.div
      className="relative z-10 flex max-w-lg flex-col items-center gap-5 text-center"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div {...base(0)}>
        <p
          className="font-display text-2xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: COLOR.text }}
        >
          NeuroNLP Nexus
        </p>
        <p
          className="mt-2 text-[10px] font-semibold uppercase tracking-[0.35em] sm:text-xs"
          style={{ color: COLOR.nexus }}
        >
          Where language meets intelligence
        </p>
      </motion.div>

      <motion.p {...base(0.5)} className="text-sm sm:text-base" style={{ color: COLOR.text }}>
        Every intelligent system begins with a question.
      </motion.p>

      <motion.p {...base(1.1)} className="text-sm italic sm:text-base" style={{ color: COLOR.muted }}>
        &ldquo;How does a machine understand us?&rdquo;
      </motion.p>

      <motion.div {...base(1.7)} className="mt-2 flex flex-col items-center gap-3">
        <button
          onClick={onEnter}
          className="group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
          style={{
            background: COLOR.nexus,
            color: "#05081A",
            boxShadow: `0 10px 30px -10px ${COLOR.nexus}99`,
          }}
        >
          Enter the Nexus
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </motion.div>
    </motion.div>
  );
}

function RevealScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center gap-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.4 }}
    >
      <div className="relative flex h-40 w-full max-w-md items-center justify-center sm:h-48">
        {/* NLP arc, left */}
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full border-2"
          style={{ width: 170, height: 170, borderColor: `${COLOR.nlp}55`, marginLeft: reduceMotion ? -170 : -95 }}
          initial={reduceMotion ? { marginLeft: -170, y: "-50%" } : { x: -40, y: "-50%" }}
          animate={reduceMotion ? { y: "-50%" } : { x: 0, y: "-50%" }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
        {/* DL arc, right */}
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full border-2"
          style={{ width: 170, height: 170, borderColor: `${COLOR.dl}55`, marginLeft: reduceMotion ? 0 : -75 }}
          initial={reduceMotion ? { y: "-50%" } : { x: 40, y: "-50%" }}
          animate={reduceMotion ? { y: "-50%" } : { x: 0, y: "-50%" }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
        {/* Convergence glow + NEXUS wordmark */}
        <motion.div
          className="relative flex h-16 w-16 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-widest sm:h-20 sm:w-20"
          style={{
            background: `radial-gradient(circle, ${COLOR.nexus}aa 0%, transparent 72%)`,
            color: COLOR.text,
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: reduceMotion ? 0.1 : 1.1, ease: "easeOut" }}
        >
          Nexus
        </motion.div>
      </div>

      {/* Domain labels -- 2026-10-07 fix: these used to be absolutely
          positioned INSIDE the circle-overlap zone (left-18%/right-14% at
          a shared y), which read fine with the arcs apart but became
          illegible once the arcs finish converging toward center (the
          two labels, and "Deep Learning"'s longer text in particular,
          landed on top of each other and on top of the Nexus wordmark).
          Moved to their own row below the circles, pinned to the far
          left/right edges via justify-between, so there's no shared
          space to collide in regardless of how close the arcs get. */}
      <motion.div
        className="flex w-full max-w-md items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.3em] sm:text-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: reduceMotion ? 0.1 : 1.3, ease: "easeOut" }}
      >
        <span style={{ color: COLOR.nlp }}>NLP</span>
        <span style={{ color: COLOR.dl }}>Deep Learning</span>
      </motion.div>

      <motion.p
        className="text-base font-medium sm:text-lg"
        style={{ color: COLOR.text }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: reduceMotion ? 0.15 : 1.7, ease: "easeOut" }}
      >
        Two worlds.
        <br />
        One intelligence.
      </motion.p>
    </motion.div>
  );
}
