import { useEffect, useRef, type RefObject } from "react";

// Cursor-reactive grid background (user spec, 2026-10-07): "An invisible
// grid sits behind the page. As the cursor moves, the cells near it softly
// light up, linger for a moment, then fade away, like leaving a trail of
// glowing tiles. Clicking sends a ring of light rippling outward across the
// grid." Ported from the standalone vanilla-JS build delivered earlier in
// this session (cursor-grid-background.js) into a React component so it can
// live directly inside the Home hero, rather than as a separately-included
// <script>. The underlying algorithm (sparse per-cell "heat" that decays
// exponentially, plus expanding-ring click splats) is unchanged from that
// file -- only the wiring (refs/effects instead of a standalone class
// instance, props instead of a loose options object) is new.
//
// Placement (per user decision, 2026-10-07): sits BEHIND the existing
// HeroNeuralField particle field and NexusSolarSystem in the Home hero,
// kept deliberately faint (low default opacity, low glow alpha) so it reads
// as texture rather than a third competing animated background.
//
// Like every other hero animation in this app, it's fully inert under
// prefers-reduced-motion (checked once via matchMedia, matching
// HeroNeuralField's own convention for non-framer-motion canvas work) --
// the grid still renders as a static, motionless texture, it just never
// tracks the cursor or ripples.

export interface CursorGridBackgroundProps {
  className?: string;
  /** Square cell size in CSS px. */
  cellSize?: number;
  /** Overall layer opacity (0-1) -- this is the main "keep it faint" knob. */
  opacity?: number;
  /** "r, g, b" string for the lit-cell glow color. */
  glowColor?: string;
  /**
   * The element whose pointer events drive the grid -- NOT the canvas
   * itself. The canvas sits behind real interactive hero content
   * (headline, CTAs, the solar system) so it's rendered with
   * pointer-events: none (see below), and its own immediate parent would
   * be this component's own wrapper div, which is also pointer-events:
   * none -- neither would ever receive a move/click. Pass the ref of the
   * actual interactive container around the hero (e.g. the hero
   * <section>) so cursor tracking is scoped to that area rather than
   * either silently doing nothing (canvas's own parent) or firing from
   * clicks anywhere on the whole page (a `window` listener).
   */
  hostRef: RefObject<HTMLElement>;
}

const DEFAULTS = {
  cellSize: 56,
  opacity: 0.35,
  glowColor: "148, 180, 255",
  glowRadiusCells: 1.6,
  glowStrength: 1,
  decayPerSecond: 0.22,
  rippleSpeed: 900,
  rippleWidth: 90,
  rippleStrength: 1,
  rippleLife: 1.1,
  baseGridColor: "rgba(255, 255, 255, 0.045)",
  glowFillAlpha: 0.16,
  glowStrokeAlpha: 0.55,
  glowBlur: 12,
  devicePixelRatioCap: 2,
};

interface Ripple {
  x: number;
  y: number;
  startTime: number;
}

class GridEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private opts: typeof DEFAULTS;
  private heat = new Map<string, number>();
  private ripples: Ripple[] = [];
  private cssWidth = 0;
  private cssHeight = 0;
  private cols = 0;
  private rows = 0;
  private offsetX = 0;
  private offsetY = 0;
  private running = false;
  private rafId: number | null = null;
  private lastFrameTime: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private reduceMotion: boolean;

  constructor(canvas: HTMLCanvasElement, opts: typeof DEFAULTS) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CursorGridBackground: 2D canvas context unavailable.");
    this.ctx = ctx;
    this.opts = opts;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);

    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", this.resize);
    }

    this.resize();
    this.draw(); // paint the static base grid immediately, even before the first frame

    if (!this.reduceMotion) this.start();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = null;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    else window.removeEventListener("resize", this.resize);
    this.heat.clear();
    this.ripples.length = 0;
  }

  handlePointerMove(x: number, y: number) {
    if (this.reduceMotion) return;
    this.heatNear(x, y);
  }

  handleClick(x: number, y: number) {
    if (this.reduceMotion) return;
    this.ripples.push({ x, y, startTime: performance.now() });
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width));
    const cssHeight = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.devicePixelRatioCap);

    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = this.opts.cellSize;
    this.cols = Math.ceil(cssWidth / cell) + 1;
    this.rows = Math.ceil(cssHeight / cell) + 1;
    this.offsetX = (cssWidth - this.cols * cell) / 2;
    this.offsetY = (cssHeight - this.rows * cell) / 2;

    if (!this.running) this.draw();
  }

  private cellAt(x: number, y: number) {
    const cell = this.opts.cellSize;
    return { col: Math.floor((x - this.offsetX) / cell), row: Math.floor((y - this.offsetY) / cell) };
  }

  private cellCenter(col: number, row: number) {
    const cell = this.opts.cellSize;
    return { x: this.offsetX + col * cell + cell / 2, y: this.offsetY + row * cell + cell / 2 };
  }

  private heatNear(x: number, y: number) {
    const { col: cCol, row: cRow } = this.cellAt(x, y);
    const radius = this.opts.glowRadiusCells;
    const spread = Math.ceil(radius);

    for (let dc = -spread; dc <= spread; dc++) {
      for (let dr = -spread; dr <= spread; dr++) {
        const col = cCol + dc;
        const row = cRow + dr;
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;

        const center = this.cellCenter(col, row);
        const dx = center.x - x;
        const dy = center.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy) / this.opts.cellSize;
        if (dist > radius) continue;

        const falloff = 1 - dist / radius;
        const target = this.opts.glowStrength * falloff;
        const key = `${col},${row}`;
        const current = this.heat.get(key) || 0;
        if (target > current) this.heat.set(key, target);
      }
    }
  }

  private applyRipples(now: number) {
    const opts = this.opts;
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      const age = (now - ripple.startTime) / 1000;
      if (age > opts.rippleLife) {
        this.ripples.splice(i, 1);
        continue;
      }

      const radius = age * opts.rippleSpeed;
      const lifeFade = 1 - age / opts.rippleLife;
      const maxReach = radius + opts.rippleWidth;

      const colMin = Math.max(0, Math.floor((ripple.x - maxReach - this.offsetX) / opts.cellSize));
      const colMax = Math.min(this.cols - 1, Math.ceil((ripple.x + maxReach - this.offsetX) / opts.cellSize));
      const rowMin = Math.max(0, Math.floor((ripple.y - maxReach - this.offsetY) / opts.cellSize));
      const rowMax = Math.min(this.rows - 1, Math.ceil((ripple.y + maxReach - this.offsetY) / opts.cellSize));

      for (let col = colMin; col <= colMax; col++) {
        for (let row = rowMin; row <= rowMax; row++) {
          const center = this.cellCenter(col, row);
          const dx = center.x - ripple.x;
          const dy = center.y - ripple.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const bandDist = Math.abs(dist - radius);
          if (bandDist > opts.rippleWidth / 2) continue;

          const band = 1 - bandDist / (opts.rippleWidth / 2);
          const target = opts.rippleStrength * band * lifeFade;
          const key = `${col},${row}`;
          const current = this.heat.get(key) || 0;
          if (target > current) this.heat.set(key, target);
        }
      }
    }
  }

  private decay(dt: number) {
    const decayMultiplier = Math.exp(-this.opts.decayPerSecond * dt * 4);
    for (const [key, value] of this.heat) {
      const next = value * decayMultiplier;
      if (next < 0.004) this.heat.delete(key);
      else this.heat.set(key, next);
    }
  }

  private draw() {
    const ctx = this.ctx;
    const opts = this.opts;
    const cell = opts.cellSize;

    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    ctx.strokeStyle = opts.baseGridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 0; col <= this.cols; col++) {
      const x = this.offsetX + col * cell;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.cssHeight);
    }
    for (let row = 0; row <= this.rows; row++) {
      const y = this.offsetY + row * cell;
      ctx.moveTo(0, y);
      ctx.lineTo(this.cssWidth, y);
    }
    ctx.stroke();

    if (this.heat.size > 0) {
      for (const [key, value] of this.heat) {
        const comma = key.indexOf(",");
        const col = Number(key.slice(0, comma));
        const row = Number(key.slice(comma + 1));
        const x = this.offsetX + col * cell;
        const y = this.offsetY + row * cell;
        const t = Math.min(1, Math.max(0, value));

        ctx.save();
        ctx.shadowColor = `rgba(${opts.glowColor}, ${t})`;
        ctx.shadowBlur = opts.glowBlur * t;
        ctx.fillStyle = `rgba(${opts.glowColor}, ${opts.glowFillAlpha * t})`;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = `rgba(${opts.glowColor}, ${opts.glowStrokeAlpha * t})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        ctx.restore();
      }
    }
  }

  private tick(now: number) {
    if (!this.running) return;
    if (this.lastFrameTime === null) this.lastFrameTime = now;
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.applyRipples(now);
    this.decay(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.tick);
  }
}

export default function CursorGridBackground({
  className,
  cellSize,
  opacity,
  glowColor,
  hostRef,
}: CursorGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GridEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const opts = {
      ...DEFAULTS,
      cellSize: cellSize ?? DEFAULTS.cellSize,
      glowColor: glowColor ?? DEFAULTS.glowColor,
    };

    const engine = new GridEngine(canvas, opts);
    engineRef.current = engine;

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      engine.handlePointerMove(e.clientX - rect.left, e.clientY - rect.top);
    };
    const handleClick = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      engine.handleClick(e.clientX - rect.left, e.clientY - rect.top);
    };

    const host = hostRef.current;
    host?.addEventListener("pointermove", handleMove);
    host?.addEventListener("pointerdown", handleClick);

    return () => {
      host?.removeEventListener("pointermove", handleMove);
      host?.removeEventListener("pointerdown", handleClick);
      engine.destroy();
      engineRef.current = null;
    };
    // Intentionally re-create the engine only if cellSize/glowColor/hostRef
    // identity change -- opacity is applied as a plain CSS style below, not
    // re-initialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellSize, glowColor, hostRef]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      style={{ opacity: opacity ?? DEFAULTS.opacity }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
