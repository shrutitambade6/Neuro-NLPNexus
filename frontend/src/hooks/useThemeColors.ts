import { useEffect, useState } from "react";

import { useThemeStore } from "../store/themeStore";

// The design tokens as literal, resolved color strings ("rgb(r, g, b)"),
// re-read from the CSS custom properties whenever the theme flips.
//
// Everywhere else in the app, a component can just use a `bg-nexus-*`
// class or (for inline SVG/Recharts props) the nexusVar() string helper —
// both resolve var() at paint time with zero JS involved. This hook exists
// only for the two contexts that genuinely need a real, literal color
// value in JavaScript rather than a CSS string: <canvas> 2D drawing
// (NeuralBackground) and Framer Motion's `animate` color interpolation
// (TextToIntelligence), neither of which can resolve `var(--x)` itself.
const TOKENS = [
  "bg",
  "surface",
  "surfaceAlt",
  "card",
  "surfaceHover",
  "border",
  "text",
  "muted",
  "faint",
  "accent",
  "accentDim",
  "purple",
  "data",
  "good",
  "warn",
  "bad",
  "yellow",
  "gold",
  "ink",
] as const;

type Token = (typeof TOKENS)[number];
export type ThemeColors = Record<Token, string>;

const FALLBACK: ThemeColors = TOKENS.reduce((acc, t) => {
  acc[t] = "#050816";
  return acc;
}, {} as ThemeColors);

function readResolvedColors(): ThemeColors {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const out = {} as ThemeColors;
  for (const token of TOKENS) {
    const raw = styles.getPropertyValue(`--nexus-${token}`).trim(); // "r g b"
    const parts = raw.split(/\s+/).filter(Boolean);
    out[token] = parts.length === 3 ? `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})` : FALLBACK[token];
  }
  return out;
}

/** Same resolved color, at a given alpha — for Framer Motion animations
 * that need a translucent version of a token (e.g. a tinted highlight
 * fading in), since it tweens actual rgba values, not CSS var()/<alpha-value>. */
export function withAlpha(rgb: string, alpha: number): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;
  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
}

export function useThemeColors(): ThemeColors {
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const [colors, setColors] = useState<ThemeColors>(readResolvedColors);

  useEffect(() => {
    // Re-read on the next frame so this runs after the [data-theme]
    // attribute (and therefore the CSS cascade) has actually updated.
    const id = requestAnimationFrame(() => setColors(readResolvedColors()));
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  return colors;
}
