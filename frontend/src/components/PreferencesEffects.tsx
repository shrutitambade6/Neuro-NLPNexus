import { useEffect } from "react";

import { usePreferencesStore } from "../store/preferencesStore";

// Applies the real, persisted Accessibility preferences to <html> as data
// attributes, which index.css's :root[data-reduce-motion="true"] /
// :root[data-text-size="large"] rules consume (see preferencesStore.ts /
// index.css). Mounted once, near the top of App.tsx, alongside the other
// no-visible-markup effect components.
export default function PreferencesEffects() {
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);
  const largeText = usePreferencesStore((s) => s.largeText);

  useEffect(() => {
    const root = document.documentElement;
    if (reduceMotion) {
      root.setAttribute("data-reduce-motion", "true");
    } else {
      root.removeAttribute("data-reduce-motion");
    }
  }, [reduceMotion]);

  useEffect(() => {
    const root = document.documentElement;
    if (largeText) {
      root.setAttribute("data-text-size", "large");
    } else {
      root.removeAttribute("data-text-size");
    }
  }, [largeText]);

  return null;
}
