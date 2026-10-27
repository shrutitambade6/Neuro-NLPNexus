// THE NEXUS SOLAR SYSTEM — the hero's central interactive visual
// (motion-first UI pass, 2026-10-07, built from the user's own reference
// infographic). A central "Nexus" core (NLP purple <-> DL amber blend)
// with three concentric orbit rings of real course concepts, color-coded
// by domain (purple = NLP, amber = Deep Learning, blue = where the two
// intersect — the same nexus-accent blue already used everywhere else in
// this app). Hovering a planet shows its name + one-line tagline;
// clicking it dims the rest and opens a small detail panel with a real
// link into the matching existing lab/page (see data/nexusConcepts.ts for
// why a few concepts route to the nearest hub page instead of a
// dedicated lab that doesn't exist in this app).
//
// Orbits are simplified to clean concentric CIRCLES rather than the
// reference image's tilted ellipses — a uniform rigid CSS rotation only
// traces a true ellipse for a shape that was already circular, so getting
// the tilted-perspective look exactly right would have meant a second,
// counter-scaled transform layer for comparatively little payoff next to
// everything else in this pass. This is "extract the visual language,
// don't paste the image" (the spec's own instruction) applied to geometry,
// not just color.
//
// User feedback 2026-10-07: the first version used this app's normal
// light/dark theme tokens for the backdrop/stars/orbit lines, which made
// the whole thing wash out to near-invisible in light theme (space isn't
// white). The backdrop, star color, and orbit-ring stroke below are now
// fixed literal colors (the exact deep-navy/star-white the spec itself
// specifies), not theme-reactive — same bespoke-literal-color exception
// already established by HeroNeuralField's own PALETTE for the same
// reason. Planet names are now always visible (not hover-only), per the
// same feedback.
import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { NEXUS_CONCEPTS, NEXUS_CORE, type NexusConcept } from "../../data/nexusConcepts";
import { DURATION, EASE_STANDARD } from "../../motion/tokens";

const RING_RADIUS_PCT: Record<1 | 2 | 3, number> = { 1: 21, 2: 32, 3: 43 };
const RING_DURATION_S: Record<1 | 2 | 3, number> = { 1: 70, 2: 100, 3: 135 };
const SIZE_PX: Record<NexusConcept["size"], number> = { sm: 26, md: 34, lg: 44 };

const DOMAIN_COLOR: Record<NexusConcept["domain"], { grad: string; ring: string; text: string }> = {
  nlp: { grad: "var(--nexus-purple)", ring: "rgb(var(--nexus-purple) / 0.55)", text: "text-nexus-purple" },
  dl: { grad: "var(--nexus-gold)", ring: "rgb(var(--nexus-gold) / 0.55)", text: "text-nexus-gold" },
  intersection: { grad: "var(--nexus-accent)", ring: "rgb(var(--nexus-accent) / 0.55)", text: "text-nexus-accent" },
};

// Fixed "deep space" literals (spec section 3: #050B1C / #07152F base,
// starlight text #E8EEF8) — deliberately NOT nexus-bg/nexus-text, which
// flip to near-white in light theme and made the whole scene disappear.
const SPACE_BG_FROM = "#07152F";
const SPACE_BG_TO = "#050B1C";
const STAR_COLOR = "232, 238, 248"; // #E8EEF8 as an rgb() triplet
const LABEL_BG = "rgba(5, 11, 28, 0.72)";
const LABEL_TEXT = "rgb(232, 238, 248)";

// Deterministic "stars" — a fixed small pseudo-random set (no Math.random
// at render time, so this never differs between renders/hydration).
function makeStars(count: number) {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => {
    const bright = rand() < 0.22;
    return {
      id: i,
      x: rand() * 100,
      y: rand() * 100,
      size: bright ? 1.8 + rand() * 1.6 : 1 + rand() * 1,
      delay: rand() * 6,
      bright,
      twinkle: rand() < 0.4,
    };
  });
}

function polar(angleDeg: number, radiusPct: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { left: `${50 + radiusPct * Math.cos(rad)}%`, top: `${50 + radiusPct * Math.sin(rad)}%` };
}

interface PlanetProps {
  concept: NexusConcept;
  active: boolean;
  dimmed: boolean;
  onActivate: (id: string) => void;
}

function Planet({ concept, active, dimmed, onActivate }: PlanetProps) {
  const reduceMotion = useReducedMotion();
  const colors = DOMAIN_COLOR[concept.domain];
  const sizePx = SIZE_PX[concept.size];
  const pos = polar(concept.angleDeg, RING_RADIUS_PCT[concept.ring]);

  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: pos.left, top: pos.top, x: "-50%", y: "-50%" }}
      // Counter-rotation: cancels the parent ring's own rotation so this
      // planet (and its always-visible name tag, and its tooltip) always
      // stays upright while still being carried around the ring by the
      // parent's transform.
      animate={reduceMotion ? undefined : { rotate: -360 }}
      transition={reduceMotion ? undefined : { duration: RING_DURATION_S[concept.ring], repeat: Infinity, ease: "linear" }}
    >
      <motion.button
        type="button"
        aria-label={`${concept.label}: ${concept.tagline}`}
        onClick={() => onActivate(concept.id)}
        className="group relative flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent"
        style={{ width: sizePx, height: sizePx }}
        animate={{
          scale: active ? 1.35 : 1,
          opacity: dimmed ? 0.25 : 1,
        }}
        transition={{ duration: DURATION.hover, ease: EASE_STANDARD }}
        whileHover={reduceMotion ? undefined : { scale: active ? 1.35 : 1.18 }}
      >
        {/* Saturn-style accent ring for a subset of planets (visual variety,
            echoing the reference image's ringed planets). */}
        {concept.hasRing && (
          <span
            aria-hidden="true"
            className="absolute rounded-full border"
            style={{
              width: sizePx * 1.7,
              height: sizePx * 0.62,
              borderColor: colors.ring,
              transform: "rotate(-18deg)",
            }}
          />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, rgb(${colors.grad}) 0%, rgb(${colors.grad} / 0.55) 55%, rgb(${colors.grad} / 0.15) 100%)`,
            boxShadow: `0 0 ${active ? 22 : 10}px rgb(${colors.grad} / ${active ? 0.75 : 0.45})`,
          }}
        />

        {/* Tooltip (full name + tagline) — lives inside this already-upright
            wrapper, so it needs no separate position tracking against the
            ring's rotation. */}
        <AnimatePresence>
          {dimmed === false && !active && (
            <TooltipIfHovered conceptId={concept.id} label={concept.label} tagline={concept.tagline} />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Always-visible compact name tag (user feedback 2026-10-07: every
          planet should carry a visible NLP/DL name, not a hover-only one).
          Fixed literal colors, same reasoning as the backdrop/stars above —
          this label sits on top of a scene that's always dark regardless
          of site theme. */}
      <motion.span
        className="pointer-events-none mt-1 select-none whitespace-nowrap rounded px-1.5 py-0.5 text-[8px] font-medium leading-none"
        style={{ background: LABEL_BG, color: LABEL_TEXT }}
        animate={{ opacity: dimmed ? 0.2 : active ? 1 : 0.85 }}
        transition={{ duration: DURATION.hover, ease: EASE_STANDARD }}
      >
        {concept.short}
      </motion.span>
    </motion.div>
  );
}

// Split out so the hover-tracking state (owned by the parent, via
// onHover/dimmed=false-as-proxy above) doesn't have to be threaded through
// a second prop just for "is THIS one specifically hovered" — the tooltip
// renders via CSS group-hover/group-focus instead, cheaper than more state.
function TooltipIfHovered({ label, tagline }: { conceptId: string; label: string; tagline: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: DURATION.micro }}
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[160px] -translate-x-1/2 rounded-lg border border-nexus-border bg-nexus-surface/95 px-2.5 py-1.5 text-left shadow-xl backdrop-blur-sm group-hover:block group-focus-visible:block"
    >
      <p className="text-[11px] font-semibold text-nexus-text">{label}</p>
      <p className="text-[10px] text-nexus-muted">{tagline}</p>
    </motion.div>
  );
}

export default function NexusSolarSystem({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const stars = useMemo(() => makeStars(46), []);
  const panelTitleId = useId();

  const focused = focusedId ? NEXUS_CONCEPTS.find((c) => c.id === focusedId) ?? null : null;
  const connectedConcepts = focused
    ? focused.connectedTo.map((id) => NEXUS_CONCEPTS.find((c) => c.id === id)).filter((c): c is NexusConcept => Boolean(c))
    : [];

  const rings: Array<1 | 2 | 3> = [1, 2, 3];

  return (
    <div className={`relative mx-auto aspect-square w-full max-w-[560px] select-none ${className ?? ""}`}>
      {/* Soft color halo, anchored to THIS component rather than the page
          section -- user feedback 2026-10-07 (second round): the previous
          version of this fix lived in Home.tsx as three blurred circles
          positioned by fixed pixel offsets against the whole hero
          <section>, sized/placed assuming the desktop two-column layout.
          Anywhere that assumption didn't hold (a narrower viewport, or
          simply the circle not sitting exactly where those offsets
          guessed), the glow missed the circle entirely and left plain
          white hard against the backdrop's edge again -- exactly the
          "outer circle outline / background white" complaint, just
          because the color wash wasn't actually reaching this component.
          Moved here and sized as a percentage of this component's own
          box, so it is correct in every layout, every time, instead of a
          page-level guess. Still three SEPARATE single-hue blurred
          circles fading to transparent on their own (never one multi-stop
          gradient across them -- that was the earlier "muddy brown" bug,
          see the project doc) and still theme-reactive --nexus-* tokens
          (not the fixed literal "deep space" colors just below, which
          must look like space regardless of theme -- this halo is the
          opposite: it exists to tie the light-theme PAGE to the circle's
          colors, and fades to imperceptible on its own in dark theme,
          where the page is already near-black). Rendered strictly BEHIND
          the opaque backdrop circle via plain DOM order (no z-index
          needed), so it only ever shows in the margin outside the circle
          -- the circle's own edge stays exactly as crisp as before; this
          never touches the circle's own rendering. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-[16%] overflow-visible">
        <div
          className="absolute left-[6%] top-[2%] h-[46%] w-[46%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(var(--nexus-purple) / 0.16), transparent 70%)" }}
        />
        <div
          className="absolute right-[0%] top-[28%] h-[50%] w-[50%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(var(--nexus-accent) / 0.14), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[0%] left-[26%] h-[44%] w-[44%] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(var(--nexus-gold) / 0.13), transparent 70%)" }}
        />
      </div>

      {/* Deep-space backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${SPACE_BG_FROM} 0%, ${SPACE_BG_TO} 75%)`,
        }}
      />
      {stars.map((s) => (
        <div
          key={s.id}
          aria-hidden="true"
          className={`absolute rounded-full ${s.twinkle && !reduceMotion ? "motion-safe:animate-pulse" : ""}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: `rgb(${STAR_COLOR})`,
            opacity: s.bright ? 0.9 : 0.55,
            boxShadow: s.bright ? `0 0 ${s.size * 2.5}px rgba(${STAR_COLOR}, 0.8)` : undefined,
            animationDuration: s.twinkle ? `${3 + s.delay}s` : undefined,
          }}
        />
      ))}

      {/* Orbit ring guides */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
        {rings.map((r) => (
          <circle
            key={r}
            cx="50"
            cy="50"
            r={RING_RADIUS_PCT[r]}
            fill="none"
            stroke={`rgba(${STAR_COLOR}, 0.28)`}
            strokeWidth={0.25}
          />
        ))}
      </svg>

      {/* Central Nexus core */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: "17%",
          height: "17%",
          x: "-50%",
          y: "-50%",
          background:
            "radial-gradient(circle at 38% 32%, rgb(var(--nexus-data)) 0%, rgb(var(--nexus-purple)) 35%, rgb(var(--nexus-gold)) 100%)",
        }}
        animate={reduceMotion ? undefined : { boxShadow: [
          "0 0 30px rgb(var(--nexus-accent) / 0.45)",
          "0 0 48px rgb(var(--nexus-accent) / 0.7)",
          "0 0 30px rgb(var(--nexus-accent) / 0.45)",
        ] }}
        transition={reduceMotion ? undefined : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-[10px] font-bold tracking-wide text-white drop-shadow">{NEXUS_CORE.label}</span>
      </motion.div>

      {/* Tiny unlabeled, non-interactive mote near the core — pure
          atmosphere, echoing the reference image's small unlabeled body. */}
      <div
        aria-hidden="true"
        className="absolute h-1.5 w-1.5 rounded-full bg-nexus-coral/70"
        style={polar(205, 11)}
      />

      {/* Orbit rings + planets */}
      {rings.map((r) => (
        <motion.div
          key={r}
          className="absolute inset-0"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={reduceMotion ? undefined : { duration: RING_DURATION_S[r], repeat: Infinity, ease: "linear" }}
        >
          {NEXUS_CONCEPTS.filter((c) => c.ring === r).map((concept) => (
            <Planet
              key={concept.id}
              concept={concept}
              active={focusedId === concept.id}
              dimmed={focusedId !== null && focusedId !== concept.id}
              onActivate={(id) => setFocusedId(id)}
            />
          ))}
        </motion.div>
      ))}

      {/* Focused-concept detail panel */}
      <AnimatePresence>
        {focused && (
          <>
            <motion.button
              type="button"
              aria-label="Close concept details"
              className="absolute inset-0 z-30 rounded-full bg-nexus-bg/40 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.micro }}
              onClick={() => setFocusedId(null)}
            />
            <motion.div
              role="dialog"
              aria-labelledby={panelTitleId}
              className="absolute inset-x-4 bottom-4 z-40 rounded-xl border border-nexus-border bg-nexus-surface/95 p-4 text-left shadow-2xl backdrop-blur-md sm:inset-x-10"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: DURATION.panel, ease: EASE_STANDARD }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${DOMAIN_COLOR[focused.domain].text}`}>
                    {focused.domain === "nlp" ? "NLP Domain" : focused.domain === "dl" ? "Deep Learning Domain" : "Intersection"}
                  </p>
                  <h3 id={panelTitleId} className="mt-0.5 text-base font-semibold text-nexus-text">
                    {focused.label}
                  </h3>
                  <p className="text-xs text-nexus-muted">{focused.tagline}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setFocusedId(null)}
                  className="rounded-md p-1 text-nexus-muted transition-colors hover:bg-nexus-surfaceAlt hover:text-nexus-text"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-nexus-muted">
                <span>
                  LEVEL <span className="font-medium text-nexus-text">{focused.level}</span>
                </span>
                {connectedConcepts.length > 0 && (
                  <span>
                    CONNECTED TO{" "}
                    <span className="font-medium text-nexus-text">
                      {connectedConcepts.map((c) => c.label).join(", ")}
                    </span>
                  </span>
                )}
              </div>

              <Link
                to={focused.route}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
              >
                Explore concept <ArrowRight size={13} />
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
