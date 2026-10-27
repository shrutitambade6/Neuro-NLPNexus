import { useEffect, useRef } from "react";

import { useThemeStore } from "../store/themeStore";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// <canvas> 2D drawing can't resolve CSS custom properties the way SVG/DOM
// styles can, so this is the one place in the app that needs a real,
// hand-picked literal palette per theme rather than a `nexusVar()` string.
// Dark: subtle glowing nodes, thin connections, low opacity (the original,
// unchanged look). Light: extremely subtle nodes, pale blue connections,
// even lower opacity — busy bright lines would read as visual noise on a
// white page, where the same lines happily recede into a near-black one.
const PALETTES = {
  dark: {
    line: (alpha: number) => `rgba(79, 124, 255, ${alpha})`,
    lineBaseAlpha: 0.12,
    node: "rgba(34, 211, 238, 0.55)",
    nodeRadius: 1.6,
    canvasOpacity: 0.6,
  },
  light: {
    line: (alpha: number) => `rgba(18, 100, 214, ${alpha})`,
    lineBaseAlpha: 0.05,
    node: "rgba(0, 143, 179, 0.3)",
    nodeRadius: 1.3,
    canvasOpacity: 0.35,
  },
} as const;

/**
 * A quiet, slow-moving node graph rendered behind the app content.
 * This is decoration only — it never blocks input and always respects
 * prefers-reduced-motion by rendering one static frame instead of animating.
 */
export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;
  // Only needed for the reduced-motion path: the animation loop already
  // reads themeRef.current fresh every frame, but a static (non-animating)
  // frame is drawn once and needs an explicit nudge to repaint in the new
  // theme's colors when the theme changes after that.
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let animationId = 0;

    const NODE_COUNT = 42;
    const LINK_DISTANCE = 140;

    function resize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      ctx!.scale(devicePixelRatio, devicePixelRatio);
    }

    function seedNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    }

    function draw() {
      if (!ctx) return;
      const palette = PALETTES[themeRef.current];
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = palette.line(palette.lineBaseAlpha * (1 - dist / LINK_DISTANCE));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = palette.node;
        ctx.beginPath();
        ctx.arc(n.x, n.y, palette.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      draw();
      animationId = requestAnimationFrame(tick);
    }

    resize();
    seedNodes();
    draw();
    redrawRef.current = draw;

    if (!prefersReducedMotion) {
      animationId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      resize();
      seedNodes();
      draw();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      redrawRef.current = null;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Animating frames already pick up the new theme on their next tick (via
  // themeRef); this repaints the reduced-motion static frame immediately
  // instead of leaving it in the old theme's colors until something else
  // happens to trigger a redraw.
  useEffect(() => {
    redrawRef.current?.();
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 w-full h-full"
      style={{ zIndex: 0, opacity: PALETTES[resolvedTheme].canvasOpacity }}
    />
  );
}
