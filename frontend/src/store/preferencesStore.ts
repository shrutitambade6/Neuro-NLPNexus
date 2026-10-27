import { create } from "zustand";
import { persist } from "zustand/middleware";

// Redesign Stage 2 — the Settings page's "Learning Preferences" and
// "Accessibility" sections. Everything here is real and immediately
// effective, not decorative: reduceMotion/largeText are applied to
// <html> by PreferencesEffects.tsx and consumed by real CSS rules in
// index.css; tooltipTrigger is read directly by ConceptTooltip. All of it
// is per-browser only (zustand persist, same pattern as domainStore/
// uiStore) — there's no backend concept of "user preferences" to sync to,
// and claiming otherwise would overclaim what this does.
export type TooltipTrigger = "hover-click" | "click-only";

interface PreferencesState {
  // Accessibility
  reduceMotion: boolean;
  largeText: boolean;
  setReduceMotion: (v: boolean) => void;
  setLargeText: (v: boolean) => void;

  // Learning preferences
  tooltipTrigger: TooltipTrigger;
  setTooltipTrigger: (v: TooltipTrigger) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      reduceMotion: false,
      largeText: false,
      setReduceMotion: (v) => set({ reduceMotion: v }),
      setLargeText: (v) => set({ largeText: v }),

      tooltipTrigger: "hover-click",
      setTooltipTrigger: (v) => set({ tooltipTrigger: v }),
    }),
    { name: "neuronlp-nexus-preferences" },
  ),
);
