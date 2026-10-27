import { useEffect, useMemo, useRef } from "react";

import { useThemeStore } from "../store/themeStore";

/**
 * Shared, mutable interaction state written by the hero's CTA buttons and
 * read by the canvas loop below — kept as a plain ref object (no React
 * state) so hovering a button never triggers a re-render, matching this
 * component's "no React state inside the animation loop" rule.
 */
export interface HeroInteractionState {
  hoverKind: "start" | "playground" | null;
  // Origin of the hover reaction, in canvas-local pixel coordinates.
  hoverX: number;
  hoverY: number;
}

export function useHeroInteraction() {
  return useRef<HeroInteractionState>({ hoverKind: null, hoverX: 0, hoverY: 0 });
}

interface Token {
  word: string;
  region: "left" | "right"; // LANGUAGE vs INTELLIGENCE, per the spec's two-region concept
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  baseAlpha: number;
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cluster: boolean;
}

// Reused directly from the app's own dual-theme tokens (see index.css) rather
// than the spec's suggested hex values verbatim — this keeps the hero field
// in exactly the same blue/cyan/gold as the buttons and badges sitting right
// next to it, instead of introducing a second, slightly different "electric
// blue." Canvas can't resolve CSS variables, so these are the same numbers,
// copied as literals (the one legitimate exception to "always use nexus
// tokens" — see NeuralBackground.tsx for the precedent). Coral is genuinely
// new (nothing in the existing palette covers it), added once, used sparingly,
// with a deepened light-mode value for contrast on white.
const PALETTE = {
  dark: {
    blue: "22, 135, 255",
    cyan: "66, 217, 255",
    gold: "255, 183, 3",
    coral: "233, 139, 170",
    tokenText: "255, 255, 255",
    orb: {
      blue: "rgba(22, 135, 255, 0.10)",
      cyan: "rgba(66, 217, 255, 0.07)",
      gold: "rgba(255, 183, 3, 0.055)",
    },
  },
  light: {
    blue: "37, 99, 235",
    cyan: "8, 145, 178",
    gold: "184, 134, 11",
    coral: "190, 64, 110",
    tokenText: "15, 23, 42",
    orb: {
      blue: "rgba(37, 99, 235, 0.06)",
      cyan: "rgba(8, 145, 178, 0.05)",
      gold: "rgba(184, 134, 11, 0.045)",
    },
  },
} as const;

// LEFT = "LANGUAGE", RIGHT = "INTELLIGENCE" (spec #11) — two loose word pools
// biased to spawn on their own side, so the token field itself reads as
// "language flowing toward intelligence" without a literal labeled diagram.
const LANGUAGE_WORDS = ["token", "syntax", "semantic", "language", "meaning", "context", "sequence"];
const INTELLIGENCE_WORDS = ["vector", "embedding", "neuron", "model", "learn", "attention", "prediction"];
const TAG_WORDS = ["NLP", "DL", "AI"];
const EMBEDDING_WORD_SETS = [
  ["king", "queen", "man", "woman"],
  ["language", "text", "sentence", "meaning"],
];
const ATTENTION_SENTENCE = ["The", "animal", "didn't", "cross", "the", "road"];
const ATTENTION_FOCUS_INDEX = 1; // "animal"
const ATTENTION_LINKS = [2, 3]; // faint arcs to "didn't" and "cross"

type Tier = "desktop" | "tablet" | "mobile";

const TIER_CONFIG: Record<Tier, {
  tokenCount: number;
  nodeCount: number;
  clusterCount: number;
  linkDistance: number;
  maxConnections: number;
  showEasterEgg: boolean;
  showEmbeddingLabels: boolean;
  showOrbs: boolean;
}> = {
  desktop: { tokenCount: 12, nodeCount: 10, clusterCount: 6, linkDistance: 125, maxConnections: 11, showEasterEgg: true, showEmbeddingLabels: true, showOrbs: true },
  tablet: { tokenCount: 7, nodeCount: 7, clusterCount: 4, linkDistance: 110, maxConnections: 7, showEasterEgg: true, showEmbeddingLabels: true, showOrbs: true },
  // Mobile: the centered text column already spans nearly the full width,
  // so there's no honest safe margin left for word-length tokens beside it
  // (spec #23's own "minimal floating tokens" still overlapped the CTA on a
  // 390px-wide screen in testing). Word tokens are dropped entirely here —
  // just a faint gradient and a handful of small, harmless dots remain.
  mobile: { tokenCount: 0, nodeCount: 5, clusterCount: 0, linkDistance: 90, maxConnections: 4, showEasterEgg: false, showEmbeddingLabels: false, showOrbs: true },
};

function tierFor(width: number): Tier {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

// A centered vertical band the field keeps quiet — spec #14/#15's "text
// protection zone." Geometric rather than measured off the real heading DOM
// node: the heading/subtitle/CTA row are always centered with a fairly
// consistent max-width and together span nearly the hero's full height, so
// this is a full-height band rather than an ellipse — an ellipse's rounded
// corners left small gaps right next to the CTA buttons and, on narrow
// mobile widths, right next to the "NeuroNLP Nexus" eyebrow label, exactly
// where a token doesn't belong.
function inProtectionZone(x: number, _y: number, width: number, _height: number, margin: number) {
  const cx = width / 2;
  const halfWidth = Math.min(width * 0.4, 400) + margin;
  return Math.abs(x - cx) < halfWidth;
}

let idSeed = 0;

export default function HeroNeuralField({
  interactionRef,
}: {
  interactionRef?: ReturnType<typeof useHeroInteraction>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;
  const redrawRef = useRef<(() => void) | null>(null);
  const fallbackInteraction = useHeroInteraction();
  const interaction = interactionRef ?? fallbackInteraction;

  // Stable per-mount id so multiple hero fields on one page (there's only
  // ever one, but this guards against a future duplicate) don't collide.
  const instanceId = useMemo(() => ++idSeed, []);
  void instanceId;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let tier: Tier = "desktop";
    let tokens: Token[] = [];
    let nodes: Node[] = [];
    let animationId = 0;
    let visible = true;
    let lastTime = performance.now();

    const pointer = { targetX: 0, targetY: 0, x: 0, y: 0 };
    let containerRect = container.getBoundingClientRect();

    const pulses: { fromX: number; fromY: number; toX: number; toY: number; t: number; speed: number; color: "blue" | "cyan" | "gold" }[] = [];
    const flashes: { x: number; y: number; start: number; color: "gold" }[] = [];
    let nextPulseAt = 0;

    let easterEgg = { active: false, start: 0, next: prefersReducedMotion ? Infinity : performance.now() + 6000 + Math.random() * 4000 };
    let embeddingLabel = { setIndex: 0, cycleStart: prefersReducedMotion ? -Infinity : performance.now() };

    function pickSpawn(region: "left" | "right" | "any", w: number, h: number, avoid: { x: number; y: number }[] = [], minDist = 0) {
      let x = 0;
      let y = 0;
      let tries = 0;
      let tooClose = true;
      do {
        x = region === "left" ? Math.random() * w * 0.42 : region === "right" ? w * 0.58 + Math.random() * w * 0.42 : Math.random() * w;
        y = Math.random() * h;
        tooClose = minDist > 0 && avoid.some((p) => Math.hypot(p.x - x, p.y - y) < minDist);
        tries++;
      } while ((inProtectionZone(x, y, w, h, 10) || tooClose) && tries < 20);
      return { x, y };
    }

    function seed() {
      tier = tierFor(width);
      const cfg = TIER_CONFIG[tier];

      const wordPool: { word: string; region: "left" | "right" }[] = [];
      for (let i = 0; i < cfg.tokenCount; i++) {
        const useLeft = i % 2 === 0;
        const list = useLeft ? LANGUAGE_WORDS : INTELLIGENCE_WORDS;
        const useTag = i === cfg.tokenCount - 1 && cfg.tokenCount > 6;
        const word = useTag ? TAG_WORDS[i % TAG_WORDS.length] : list[(i >> 1) % list.length];
        wordPool.push({ word, region: useLeft ? "left" : "right" });
      }

      const placedTokenPositions: { x: number; y: number }[] = [];
      tokens = wordPool.map(({ word, region }) => {
        const { x, y } = pickSpawn(region, width, height, placedTokenPositions, 52);
        placedTokenPositions.push({ x, y });
        return {
          word,
          region,
          x,
          y,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          phase: Math.random() * Math.PI * 2,
          baseAlpha: 0.32 + Math.random() * 0.22,
        };
      });

      const freeCount = cfg.nodeCount;
      nodes = Array.from({ length: freeCount }, () => {
        const { x, y } = pickSpawn("any", width, height);
        return { x, y, vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1, cluster: false };
      });

      if (cfg.clusterCount > 0) {
        // Embedding cluster (spec #19): a tight group of nodes near one edge
        // that stay close to a shared, slowly drifting centroid rather than
        // roaming the whole field like the general node pool.
        const centroidX = width * 0.86;
        const centroidY = height * 0.28;
        for (let i = 0; i < cfg.clusterCount; i++) {
          const angle = (i / cfg.clusterCount) * Math.PI * 2;
          nodes.push({
            x: centroidX + Math.cos(angle) * 22,
            y: centroidY + Math.sin(angle) * 22,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            cluster: true,
          });
        }
      }
    }

    function resize() {
      // container/canvas/ctx are all checked non-null once, right above,
      // before this closure is ever created — safe to assert here.
      width = container!.offsetWidth;
      height = container!.offsetHeight;
      canvas!.width = width * devicePixelRatio;
      canvas!.height = height * devicePixelRatio;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      containerRect = container!.getBoundingClientRect();
    }

    function clampSpeed(p: { vx: number; vy: number }, max: number) {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > max) {
        p.vx = (p.vx / speed) * max;
        p.vy = (p.vy / speed) * max;
      }
    }

    function applyEdgeRepulsion(p: { x: number; y: number; vx: number; vy: number }) {
      // The zone is a vertical band, so the push is purely horizontal —
      // toward whichever side edge is closer.
      if (inProtectionZone(p.x, p.y, width, height, 34)) {
        const cx = width / 2;
        const dir = p.x - cx >= 0 ? 1 : -1;
        p.vx += dir * 0.02;
        clampSpeed(p, 0.14);
      }
    }

    function step(dt: number) {
      const cfg = TIER_CONFIG[tier];
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;

      for (const t of tokens) {
        t.phase += dt * 0.0006;
        t.x += t.vx * dt * 0.06 + Math.sin(t.phase) * 0.03;
        t.y += t.vy * dt * 0.06 + Math.cos(t.phase * 0.8) * 0.03;
        if (t.x < 10 || t.x > width - 10) t.vx *= -1;
        if (t.y < 10 || t.y > height - 10) t.vy *= -1;
        applyEdgeRepulsion(t);
      }

      for (const n of nodes) {
        if (n.cluster) {
          // Gentle drift only — the cluster's own centroid isn't recomputed
          // every frame (kept intentionally simple/cheap); the tiny random
          // walk plus mutual closeness from the seed positions is enough to
          // read as "gently reorganizing."
          n.x += n.vx * dt * 0.05;
          n.y += n.vy * dt * 0.05;
          if (Math.random() < 0.004) n.vx += (Math.random() - 0.5) * 0.03;
          if (Math.random() < 0.004) n.vy += (Math.random() - 0.5) * 0.03;
        } else {
          n.x += n.vx * dt * 0.06;
          n.y += n.vy * dt * 0.06;
          if (n.x < 6 || n.x > width - 6) n.vx *= -1;
          if (n.y < 6 || n.y > height - 6) n.vy *= -1;
          applyEdgeRepulsion(n);
        }
      }

      // Sparse connections: closest pairs under the tier's link distance,
      // capped at maxConnections so the field can never read as "dense."
      const candidates: { i: number; j: number; dist: number }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (d < cfg.linkDistance) candidates.push({ i, j, dist: d });
        }
      }
      candidates.sort((a, b) => a.dist - b.dist);
      const activeEdges = candidates.slice(0, cfg.maxConnections);

      const now = performance.now();
      if (!prefersReducedMotion && activeEdges.length && now >= nextPulseAt) {
        const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
        const a = nodes[edge.i];
        const b = nodes[edge.j];
        const flip = Math.random() < 0.5;
        const color: "blue" | "cyan" | "gold" = Math.random() < 0.09 ? "gold" : Math.random() < 0.5 ? "blue" : "cyan";
        pulses.push({
          fromX: flip ? a.x : b.x,
          fromY: flip ? a.y : b.y,
          toX: flip ? b.x : a.x,
          toY: flip ? b.y : a.y,
          t: 0,
          speed: 0.0011 + Math.random() * 0.0006,
          color,
        });
        nextPulseAt = now + 2600 + Math.random() * 2200;
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed * dt;
        if (p.t >= 1) {
          if (p.color === "gold") {
            flashes.push({ x: p.toX, y: p.toY, start: now, color: "gold" });
          }
          pulses.splice(i, 1);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        if (now - flashes[i].start > 500) flashes.splice(i, 1);
      }

      if (cfg.showEasterEgg) {
        if (!easterEgg.active && now >= easterEgg.next) {
          easterEgg = { active: true, start: now, next: easterEgg.next };
        } else if (easterEgg.active && now - easterEgg.start > 2600) {
          easterEgg = { active: false, start: 0, next: now + 18000 + Math.random() * 8000 };
        }
      }

      if (cfg.showEmbeddingLabels && now - embeddingLabel.cycleStart > 4200) {
        embeddingLabel = { setIndex: (embeddingLabel.setIndex + 1) % EMBEDDING_WORD_SETS.length, cycleStart: now };
      }

      return { activeEdges, now };
    }

    function draw(sim?: { activeEdges: { i: number; j: number; dist: number }[]; now: number }) {
      const palette = PALETTE[themeRef.current];
      const cfg = TIER_CONFIG[tier];
      ctx!.clearRect(0, 0, width, height);

      const hover = interaction.current;
      const hoverColor = hover.hoverKind === "playground" ? palette.gold : palette.blue;

      const activeEdges = sim?.activeEdges ?? [];
      const now = sim?.now ?? performance.now();

      // Connections
      for (const edge of activeEdges) {
        const a = nodes[edge.i];
        const b = nodes[edge.j];
        const alpha = (1 - edge.dist / cfg.linkDistance) * 0.16;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const ax = a.x + pointer.x * 5;
        const ay = a.y + pointer.y * 5;
        const bx = b.x + pointer.x * 5;
        const by = b.y + pointer.y * 5;
        ctx!.strokeStyle = `rgba(${palette.blue}, ${alpha})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(bx, by);
        ctx!.stroke();

        // CTA-hover reaction (spec #27): edges near the hovered button get a
        // second, color-coded highlight stroke on top — blue for "Start
        // learning," gold for "Open NLP Playground" — instead of touching
        // the base blue connections everywhere else.
        if (hover.hoverKind) {
          const d = Math.hypot(midX - hover.hoverX, midY - hover.hoverY);
          if (d < 150) {
            ctx!.strokeStyle = `rgba(${hoverColor}, ${(1 - d / 150) * 0.28})`;
            ctx!.beginPath();
            ctx!.moveTo(ax, ay);
            ctx!.lineTo(bx, by);
            ctx!.stroke();
          }
        }
      }

      // Nodes
      for (const n of nodes) {
        const ox = n.x + pointer.x * 5;
        const oy = n.y + pointer.y * 5;
        // Final safety net (spec #15's "never overlap the text," taken
        // literally): the simulation's own repulsion keeps particles
        // drifting out of the protection zone, but it's a soft nudge, not
        // an instant teleport, so a fast-moving node can still be mid-
        // crossing on any given frame. Skipping the actual paint for
        // anything still inside the zone this frame guarantees zero visual
        // overlap regardless of simulation timing.
        if (inProtectionZone(ox, oy, width, height, 0)) continue;
        const alpha = n.cluster ? 0.4 : 0.5;
        const radius = n.cluster ? 1.5 : 1.8;
        ctx!.fillStyle = `rgba(${palette.cyan}, ${alpha})`;
        ctx!.beginPath();
        ctx!.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx!.fill();

        if (hover.hoverKind) {
          const d = Math.hypot(ox - hover.hoverX, oy - hover.hoverY);
          if (d < 150) {
            const boost = 1 - d / 150;
            ctx!.fillStyle = `rgba(${hoverColor}, ${boost * 0.45})`;
            ctx!.beginPath();
            ctx!.arc(ox, oy, radius + boost * 1.6, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }

      // Data pulses
      for (const p of pulses) {
        const x = p.fromX + (p.toX - p.fromX) * p.t + pointer.x * 5;
        const y = p.fromY + (p.toY - p.fromY) * p.t + pointer.y * 5;
        const rgb = palette[p.color];
        ctx!.fillStyle = `rgba(${rgb}, 0.85)`;
        ctx!.beginPath();
        ctx!.arc(x, y, 2, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Gold "insight" flashes
      for (const f of flashes) {
        const t = (now - f.start) / 500;
        if (t > 1) continue;
        ctx!.strokeStyle = `rgba(${palette.gold}, ${0.5 * (1 - t)})`;
        ctx!.lineWidth = 1.2;
        ctx!.beginPath();
        ctx!.arc(f.x + pointer.x * 5, f.y + pointer.y * 5, 3 + t * 10, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Floating tokens
      ctx!.font = "10px 'Inter', system-ui, sans-serif";
      ctx!.textBaseline = "middle";
      for (const tk of tokens) {
        const ox = tk.x + pointer.x * 10;
        const oy = tk.y + pointer.y * 10;
        // Same safety net as nodes, above — plus a little extra margin
        // since a word's rendered width extends past its anchor point.
        if (inProtectionZone(ox, oy, width, height, 20)) continue;
        let alpha = tk.baseAlpha * 0.55;
        if (hover.hoverKind) {
          const d = Math.hypot(ox - hover.hoverX, oy - hover.hoverY);
          if (d < 170) alpha += (1 - d / 170) * 0.25;
        }
        ctx!.fillStyle = `rgba(${palette.tokenText}, ${alpha})`;
        ctx!.fillText(tk.word, ox, oy);
      }

      // Embedding cluster label
      if (cfg.showEmbeddingLabels) {
        const cycleT = now - embeddingLabel.cycleStart;
        const envelope = cycleT < 500 ? cycleT / 500 : cycleT > 3600 ? Math.max(0, 1 - (cycleT - 3600) / 500) : 1;
        if (envelope > 0.01) {
          const words = EMBEDDING_WORD_SETS[embeddingLabel.setIndex];
          const baseX = width * 0.86 + pointer.x * 5;
          const baseY = height * 0.28 + pointer.y * 5;
          ctx!.font = "9px 'Inter', system-ui, sans-serif";
          words.forEach((w, i) => {
            const angle = (i / words.length) * Math.PI * 2 + 0.4;
            const wx = baseX + Math.cos(angle) * 34;
            const wy = baseY + Math.sin(angle) * 34;
            ctx!.fillStyle = `rgba(${palette.coral}, ${0.4 * envelope})`;
            ctx!.fillText(w, wx, wy);
          });
        }
      }

      // Attention easter egg
      if (cfg.showEasterEgg && easterEgg.active) {
        const t = now - easterEgg.start;
        const envelope = t < 400 ? t / 400 : t > 1900 ? Math.max(0, 1 - (t - 1900) / 700) : 1;
        if (envelope > 0.01) {
          const bandY = height * 0.86;
          const startX = width * 0.08;
          const gap = Math.min(64, (width * 0.7) / ATTENTION_SENTENCE.length);
          const positions = ATTENTION_SENTENCE.map((_, i) => startX + i * gap);
          ctx!.font = "9px 'Inter', system-ui, sans-serif";
          ATTENTION_LINKS.forEach((li) => {
            ctx!.strokeStyle = `rgba(${palette.blue}, ${0.22 * envelope})`;
            ctx!.lineWidth = 0.75;
            ctx!.beginPath();
            ctx!.moveTo(positions[ATTENTION_FOCUS_INDEX], bandY);
            ctx!.lineTo(positions[li], bandY);
            ctx!.stroke();
          });
          ATTENTION_SENTENCE.forEach((word, i) => {
            const isFocus = i === ATTENTION_FOCUS_INDEX;
            ctx!.fillStyle = isFocus
              ? `rgba(${palette.gold}, ${0.55 * envelope})`
              : `rgba(${palette.tokenText}, ${0.22 * envelope})`;
            ctx!.fillText(word, positions[i], bandY);
          });
        }
      }
    }

    function tick(time: number) {
      const dt = Math.min(48, time - lastTime);
      lastTime = time;
      const sim = step(dt);
      draw(sim);
      // Imperative CSS parallax for the gradient orbs — compositor-only
      // (transform), no React state, matches everything else here.
      orbRefs.current.forEach((el, i) => {
        if (!el) return;
        const mult = 8 + i * 5;
        el.style.transform = `translate3d(${pointer.x * mult}px, ${pointer.y * mult}px, 0)`;
      });
      if (visible) animationId = requestAnimationFrame(tick);
    }

    function handlePointerMove(e: PointerEvent) {
      const nx = ((e.clientX - containerRect.left) / containerRect.width) * 2 - 1;
      const ny = ((e.clientY - containerRect.top) / containerRect.height) * 2 - 1;
      pointer.targetX = Math.max(-1, Math.min(1, nx));
      pointer.targetY = Math.max(-1, Math.min(1, ny));
    }
    function handlePointerLeave() {
      pointer.targetX = 0;
      pointer.targetY = 0;
    }

    resize();
    seed();
    draw();
    redrawRef.current = () => draw();

    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave);
      animationId = requestAnimationFrame(tick);
    }

    let currentTier = tierFor(width);
    const handleResize = () => {
      resize();
      const newTier = tierFor(width);
      if (newTier !== currentTier) {
        currentTier = newTier;
        seed();
      }
      draw();
    };
    window.addEventListener("resize", handleResize);

    // Pause the loop entirely when the hero scrolls out of view or the tab
    // is backgrounded — the single biggest, cheapest performance guard for
    // an always-on canvas animation.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && !document.hidden;
        if (visible && !prefersReducedMotion && !animationId) {
          lastTime = performance.now();
          animationId = requestAnimationFrame(tick);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    const handleVisibility = () => {
      visible = !document.hidden && visible;
      if (document.hidden) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      } else if (!prefersReducedMotion && !animationId) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      redrawRef.current = null;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawRef.current?.();
  }, [resolvedTheme]);

  const palette = PALETTE[resolvedTheme];

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-[1]">
      {/* Layer 1: extremely subtle gradient atmosphere (spec #6) — pure CSS,
          no per-frame JS cost beyond the transform write in the rAF loop. */}
      <div
        ref={(el) => { orbRefs.current[0] = el; }}
        className="absolute -top-16 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${palette.orb.cyan}, transparent 70%)` }}
      />
      <div
        ref={(el) => { orbRefs.current[1] = el; }}
        className="absolute top-1/3 -left-10 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${palette.orb.blue}, transparent 70%)` }}
      />
      <div
        ref={(el) => { orbRefs.current[2] = el; }}
        className="absolute bottom-0 right-0 h-[340px] w-[340px] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${palette.orb.gold}, transparent 70%)` }}
      />
      {/* Layers 2 & 3: nodes/connections/pulses and floating tokens, all in
          one canvas for a single draw call per frame. */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
