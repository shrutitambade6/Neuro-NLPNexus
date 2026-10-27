// BEHIND THE NEXUS (2026-10-08 user spec) — the platform's emotional/
// human final chapter: a cinematic opening, the three-node knowledge
// constellation (NexusOrbit — NLP mentor / DL mentor / Builder, each
// opening a detail panel on click), "What Inspired This Platform,"
// the "Knowledge is never built alone" transition, and a closing
// "THE NEXUS DOESN'T END HERE" section with two CTAs.
//
// Deliberately an ADDITION, not a redesign (spec section 19/20): reuses
// the existing route/layout system (mounted under StudentLayout, same
// as every other protected page — see App.tsx), the existing motion
// tokens/primitives, the existing nexus-* theme tokens for every piece
// of UI chrome (headings, body text, buttons) outside the deliberately
// fixed-literal deep-space constellation visual (NexusOrbit.tsx, same
// exception NexusSolarSystem.tsx already established). No sidebar
// entry was added (spec section 21) — reached via a subtle link on the
// Profile page instead; see Profile.tsx.
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import NexusOrbit from "../components/behindnexus/NexusOrbit";
import MobileConstellation from "../components/behindnexus/MobileConstellation";
import StorySection from "../components/behindnexus/StorySection";
import { HoverLift, PageEnter } from "../motion/primitives";
import { DURATION, EASE_STANDARD } from "../motion/tokens";
import { BUILDER, INSPIRATION_CARDS } from "../data/behindNexus";

export default function BehindNexus() {
  const reduceMotion = useReducedMotion();

  return (
    <PageEnter className="mx-auto max-w-5xl space-y-20 pb-16">
      {/* 1. Cinematic opening / hero (spec section 3) */}
      <section className="space-y-5 pt-4 text-center">
        <motion.h1
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.scene, ease: EASE_STANDARD }}
          className="text-3xl font-bold tracking-tight text-nexus-text sm:text-4xl"
        >
          BEHIND THE NEXUS
        </motion.h1>
        <motion.p
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.scene, delay: reduceMotion ? 0 : 0.1, ease: EASE_STANDARD }}
          className="text-lg font-medium text-nexus-accent"
        >
          Every learning experience has people behind it.
        </motion.p>
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.scene, delay: reduceMotion ? 0 : 0.2, ease: EASE_STANDARD }}
          className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-nexus-muted"
        >
          <p>
            NeuroNLP Nexus was created as a student-driven exploration of Natural Language Processing and Deep
            Learning — bringing together classroom knowledge, experimentation, design, and technology into one
            interactive learning experience.
          </p>
          <p>This journey would not have been possible without the guidance of the faculty who helped shape the knowledge behind it.</p>
        </motion.div>
      </section>

      {/* 2. The knowledge constellation (spec sections 4-10). Below the
          `sm` breakpoint the orbiting layout gives way entirely to a
          vertical accordion stack (spec section 17: "Do NOT force
          three nodes into a tiny orbit... transform the experience
          into Nexus center -> NLP Mentor -> DL Mentor -> Builder") --
          same content, same storytelling, just not orbiting. */}
      <section aria-label="The people behind NeuroNLP Nexus">
        <div className="hidden sm:block">
          <NexusOrbit />
          <p className="mx-auto mt-4 max-w-md text-center text-xs text-nexus-muted">
            Select a node to enter that person's contribution to the Nexus.
          </p>
        </div>
        <MobileConstellation className="mx-auto max-w-sm sm:hidden" />
      </section>

      {/* 3. What inspired this platform (spec section 11) */}
      <StorySection>
        <h2 className="text-center text-xl font-semibold text-nexus-text">WHAT INSPIRED THIS PLATFORM</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {INSPIRATION_CARDS.map((card) => (
            <HoverLift key={card.index} className="rounded-xl border border-nexus-border bg-nexus-surface p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-nexus-accent">
                {card.index} — {card.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{card.text}</p>
            </HoverLift>
          ))}
        </div>
      </StorySection>

      {/* 4. "Knowledge is never built alone" emotional transition (spec section 12) */}
      <StorySection className="mx-auto max-w-2xl space-y-4 text-center">
        <h2 className="text-2xl font-semibold text-nexus-text">Knowledge is never built alone.</h2>
        <p className="text-sm leading-relaxed text-nexus-muted">
          NeuroNLP Nexus is a student-built learning experience shaped by classroom knowledge, faculty guidance,
          experimentation, curiosity, and countless iterations.
        </p>
        <p className="text-sm leading-relaxed text-nexus-muted">
          To my faculty mentors — thank you for teaching not only concepts, but ways of thinking.
        </p>
      </StorySection>

      {/* 5. Final story ending (spec section 13) */}
      <StorySection className="mx-auto max-w-2xl space-y-5 text-center">
        <h2 className="text-2xl font-bold text-nexus-text">THE NEXUS DOESN'T END HERE.</h2>
        <p className="text-sm leading-relaxed text-nexus-muted">
          It evolves with every concept learned, every experiment run, and every question asked.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            EXPLORE THE NEXUS <ArrowRight size={15} />
          </Link>
          <a
            href={BUILDER.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-4 py-2 text-sm font-semibold text-nexus-text transition-colors hover:border-nexus-data hover:text-nexus-data"
          >
            CONNECT WITH THE BUILDER <ArrowUpRight size={15} />
          </a>
        </div>
      </StorySection>
    </PageEnter>
  );
}
