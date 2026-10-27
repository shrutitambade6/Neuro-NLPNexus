// A tiny, centralized helper for the handful of places that can't just use
// a `bg-nexus-*` / `text-nexus-*` Tailwind class — inline SVG attributes
// and Recharts style props. Browsers resolve CSS custom properties inside
// these strings at paint time exactly like they do in stylesheets, so a
// component using `nexusVar("accent")` stays theme-reactive automatically,
// with zero re-render needed when the theme flips. This is NOT needed (and
// won't work) for <canvas> 2D drawing — see useThemeColors for that case.
export function nexusVar(token: string, alpha = 1): string {
  return alpha >= 1 ? `rgb(var(--nexus-${token}))` : `rgb(var(--nexus-${token}) / ${alpha})`;
}
