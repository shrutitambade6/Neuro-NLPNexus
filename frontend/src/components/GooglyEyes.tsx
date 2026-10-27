import { useEffect, useRef, type CSSProperties } from "react";

// A pair of cartoon "googly" eyes (user spec, 2026-10-07) that track the
// cursor anywhere on the page and blink every few seconds. Ported from the
// standalone demo delivered earlier in this session (googly-eyes.html)
// into a React component.
//
// Placement (per user decision, 2026-10-07): beside the hero headline
// ("Explore the universe of language and intelligence.") on the Home
// page, at a reduced `scale` so a ~100px cartoon-eye pair reads as a small
// accent next to the heading rather than competing with it.
//
// Class names are prefixed googly-* (.googly-eyes-scene/.googly-eye/
// .googly-pupil, defined in index.css) rather than the standalone demo's
// bare .eye/.pupil, to avoid any risk of colliding with existing app
// classes.
//
// Under prefers-reduced-motion, the mousemove listener and blink interval
// are simply never started -- the pupils stay centered and the eyes never
// blink, same "render a static version, skip the motion" convention as
// every other hero animation in this app (checked once via matchMedia,
// matching HeroNeuralField's own non-framer-motion canvas convention).

export interface GooglyEyesProps {
  className?: string;
  /**
   * Uniform scale for the whole pair (1 = the base ~100px-per-eye size
   * the standalone demo used). Applied via the --eye-scale CSS variable
   * that index.css's .googly-eyes-scene rule already reads, including the
   * negative-margin compensation so scaling down doesn't leave empty
   * reserved layout space around the shrunk pair.
   */
  scale?: number;
}

const BLINK_INTERVAL_MS = 3000; // how often the eyes blink
const BLINK_DURATION_MS = 150; // how long the squash-closed pose holds (matches the CSS transition in index.css)
const MAX_PUPIL_OFFSET_PX = 28; // how far from centre a pupil can travel, at most
const DISTANCE_DIVISOR = 8; // bigger number = pupils drift less for the same cursor distance

export default function GooglyEyes({ className, scale }: GooglyEyesProps) {
  const sceneRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const eyes = Array.from(scene.querySelectorAll<HTMLSpanElement>(".googly-eye"));
    if (eyes.length === 0) return;

    function updatePupils(clientX: number, clientY: number) {
      for (const eye of eyes) {
        const pupil = eye.querySelector<HTMLSpanElement>(".googly-pupil");
        if (!pupil) continue;

        // getBoundingClientRect() already reflects the --eye-scale
        // transform, so this math is correct regardless of `scale`.
        const rect = eye.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.min(MAX_PUPIL_OFFSET_PX, distance / DISTANCE_DIVISOR);

        const x = Math.cos(angle) * offset;
        const y = Math.sin(angle) * offset;
        pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    }

    function handleMove(e: MouseEvent) {
      updatePupils(e.clientX, e.clientY);
    }
    window.addEventListener("mousemove", handleMove);

    const blinkInterval = window.setInterval(() => {
      eyes.forEach((eye) => eye.classList.add("googly-eye--blink"));
      window.setTimeout(() => {
        eyes.forEach((eye) => eye.classList.remove("googly-eye--blink"));
      }, BLINK_DURATION_MS);
    }, BLINK_INTERVAL_MS);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.clearInterval(blinkInterval);
    };
  }, []);

  const style = { "--eye-scale": scale ?? 1 } as unknown as CSSProperties;

  return (
    <span ref={sceneRef} aria-hidden="true" className={`googly-eyes-scene ${className ?? ""}`} style={style}>
      <span className="googly-eye">
        <span className="googly-pupil" />
      </span>
      <span className="googly-eye">
        <span className="googly-pupil" />
      </span>
    </span>
  );
}
