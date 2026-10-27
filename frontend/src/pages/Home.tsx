import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import CursorGridBackground from "../components/CursorGridBackground";
import FluidCursorBackground from "../components/FluidCursorBackground";
import GooglyEyes from "../components/GooglyEyes";
import NexusSolarSystem from "../components/hero/NexusSolarSystem";
import NexusIntro, { hasSeenNexusIntro } from "../components/intro/NexusIntro";
import Reveal from "../components/Reveal";
import HeroNeuralField, { useHeroInteraction } from "../components/HeroNeuralField";
import NexiMascot from "../components/nexi/NexiMascot";

// NEXI's brief hero cameo (spec's "Interactive Cartoon & Motion System",
// section 3): appears, looks around for a beat, then settles into its
// normal welcoming idle — roughly the requested ~1s, and it never blocks
// or delays the real hero content (heading/buttons animate in on their own
// schedule regardless of this). Under reduced motion it just renders
// already-settled, no entrance.
function HeroNexi() {
  const reduceMotion = useReducedMotion();
  const [settled, setSettled] = useState(reduceMotion ?? false);

  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setSettled(true), 550);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <NexiMascot mood={settled ? "welcome" : "searching"} size="sm" label="NEXI" />
    </motion.div>
  );
}

// Staggered entrance for the three heading lines: each fades up and
// sharpens into focus, offset ~120ms from the line before it. No bounce —
// a single easeOut curve per line, per the spec.
const headingContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const headingLine: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

// "Build intelligence." gets its own treatment: a blue->cyan gradient fill,
// a soft glow, a single light sweep across it the moment it appears, and
// then — once that sweep finishes — a very subtle periodic shimmer every
// few seconds (never a constant animation). Fully inert under
// prefers-reduced-motion, same as everything else on this page.
function HeroHighlight() {
  const reduceMotion = useReducedMotion();
  const [sweepDone, setSweepDone] = useState(false);

  if (reduceMotion) {
    return (
      <span className="bg-gradient-to-r from-nexus-accent to-nexus-data bg-clip-text text-transparent">
        and intelligence.
      </span>
    );
  }

  return (
    <motion.span
      className="relative inline-block bg-gradient-to-r from-nexus-accent via-nexus-data to-nexus-accent bg-[length:200%_auto] bg-clip-text text-transparent"
      style={{ filter: "drop-shadow(0 0 14px rgb(var(--nexus-accent) / 0.35))" }}
      initial={{ backgroundPosition: "0% 50%" }}
      animate={
        sweepDone
          ? { backgroundPosition: ["0% 50%", "18% 50%", "0% 50%"] }
          : { backgroundPosition: "200% 50%" }
      }
      transition={
        sweepDone
          ? { duration: 2.2, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }
          : { duration: 1.3, ease: "easeOut" }
      }
      onAnimationComplete={() => !sweepDone && setSweepDone(true)}
    >
      and intelligence.
    </motion.span>
  );
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const interaction = useHeroInteraction();
  // Storytelling-UI opening experience (2026-10-07, sections 1/2/15/16 of
  // the user's spec). Lazy-init from localStorage so a returning visitor
  // never even flashes the intro for a frame before this check resolves.
  // Home's OWN content below still mounts immediately regardless -- the
  // intro is a fixed full-viewport overlay sitting on top of it (z-[200]),
  // not a gate that delays this page's real render.
  //
  // 2026-10-08: added a `?intro` URL override so the intro can always be
  // previewed on demand (visiting "/?intro") without having to clear the
  // "already seen" localStorage flag through DevTools every time -- a
  // real visitor's URL never carries this param, so normal first-time/
  // returning behavior is completely unaffected either way.
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("intro")) {
      return true;
    }
    return !hasSeenNexusIntro();
  });

  // Both CTAs report a rough "reaction origin" (their own position, in
  // hero-local pixels) to the neural field on hover — spec #27. Nothing
  // physically moves much; the field boosts glow/connection alpha near
  // that point and fades it back out once hoverKind clears.
  const reportHover = (kind: "start" | "playground") => (e: React.MouseEvent<HTMLElement>) => {
    const heroBox = heroRef.current?.getBoundingClientRect();
    const btnBox = e.currentTarget.getBoundingClientRect();
    if (!heroBox) return;
    interaction.current.hoverKind = kind;
    interaction.current.hoverX = btnBox.left + btnBox.width / 2 - heroBox.left;
    interaction.current.hoverY = btnBox.top + btnBox.height / 2 - heroBox.top;
  };
  const clearHover = () => {
    interaction.current.hoverKind = null;
  };

  return (
    <div className="space-y-14">
      {showIntro && <NexusIntro onComplete={() => setShowIntro(false)} />}
      {/* Fluid cursor trail (user spec, 2026-10-07) -- originally
          mounted app-wide in App.tsx; the user asked (same day) to
          scope it down to just Home and the sign-in page instead, so
          it's mounted locally here and in Login.tsx now. Mounting
          it inside a page means it mounts/unmounts with that page,
          which is exactly what "only on these two pages" means --
          its own position:fixed overlay renders the same regardless
          of where in the tree it sits. */}
      <FluidCursorBackground />
      <section ref={heroRef} className="relative overflow-hidden pt-6 pb-2 min-h-[80vh] flex items-center">
        {/* The light-theme "page background should pick up the solar
            system's own colors" wash used to live here as three blurred
            circles positioned by fixed pixel offsets against this whole
            <section> -- user feedback 2026-10-07 (second round): that
            guessed-offset approach assumed the desktop two-column layout
            and missed the circle in other layouts/viewports, leaving plain
            white around it again. Moved into NexusSolarSystem.tsx itself,
            sized as a percentage of that component's own box so it always
            surrounds the circle correctly regardless of where/how this
            page lays it out -- see the halo block at the top of that
            component for the full rationale and history (muddy-gradient
            fix, edge-feather revert, etc.). Nothing to render here now. */}

        {/* Cursor-reactive grid background (user spec, 2026-10-07) --
            kept faint and placed BEHIND the particle field and solar
            system below (z-0, lowest in the hero's stacking order) so it
            reads as subtle texture rather than a third competing
            animated layer. Scoped to this hero section via heroRef --
            see CursorGridBackground.tsx's hostRef doc for why. */}
        <CursorGridBackground hostRef={heroRef} className="z-0" />
        <HeroNeuralField interactionRef={interaction} />

        <div className="relative z-10 grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 mb-2 lg:justify-start">
              <HeroNexi />
              <p className="font-display text-xs font-semibold tracking-[0.3em] text-nexus-accent uppercase">
                NeuroNLP Nexus
              </p>
            </div>
            <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-nexus-muted mb-4">
              Where language meets intelligence
            </p>

            {/* Googly eyes (user spec, 2026-10-07) -- placed beside the
                headline, scaled down to ~40% so the ~100px cartoon-eye
                pair reads as a small accent rather than competing with
                the heading. Hidden below sm: at the centered mobile
                heading size there isn't room beside the text without
                crowding it. */}
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <motion.h1
                className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-nexus-text leading-tight"
                variants={reduceMotion ? undefined : headingContainer}
                initial={reduceMotion ? undefined : "hidden"}
                animate={reduceMotion ? undefined : "show"}
              >
                <motion.span className="block" variants={reduceMotion ? undefined : headingLine}>
                  Explore the universe
                </motion.span>
                <motion.span className="block" variants={reduceMotion ? undefined : headingLine}>
                  of language
                </motion.span>
                <motion.span className="block" variants={reduceMotion ? undefined : headingLine}>
                  <HeroHighlight />
                </motion.span>
              </motion.h1>
              <GooglyEyes className="hidden sm:flex shrink-0" scale={0.4} />
            </div>

            <p className="text-nexus-muted text-sm mt-4 max-w-md mx-auto lg:mx-0">
              An interactive learning universe for understanding Natural Language
              Processing and Deep Learning — from fundamental concepts to the
              systems that power modern AI.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 lg:justify-start">
              <Link
                to="/foundations"
                onMouseEnter={reportHover("start")}
                onMouseLeave={clearHover}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgb(var(--nexus-accent)/0.55)]"
              >
                Explore the Nexus
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                to="/playground"
                onMouseEnter={reportHover("playground")}
                onMouseLeave={clearHover}
                className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-gold/50 bg-nexus-gold/10 px-5 py-2.5 text-sm font-semibold text-nexus-gold transition-all hover:-translate-y-0.5 hover:border-nexus-gold hover:bg-nexus-gold/20"
              >
                Enter the Learning Lab
              </Link>
            </div>
          </div>

          <NexusSolarSystem className="lg:max-w-none" />
        </div>
      </section>

      <Reveal delay={0.15} className="text-center">
        <Link
          to="/dashboard"
          className="text-sm text-nexus-accent hover:underline"
        >
          Go to your Command Center →
        </Link>
      </Reveal>
    </div>
  );
}
