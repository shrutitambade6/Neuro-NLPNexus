import { create } from "zustand";
import { persist } from "zustand/middleware";

// App-wide UI chrome state: the command palette and the collapsible
// learning drawer (Redesign Stage 1 — replaces the old always-visible
// Sidebar). Only drawerOpen is persisted (zustand's existing persist
// middleware, same pattern as domainStore) — a per-browser convenience so
// a student's choice survives a reload. It defaults to open so nothing
// disappears for an existing student on their first visit after this
// change; commandPaletteOpen is deliberately transient and always starts
// closed.
//
// "Remove the Progress button from the UI" pass: this used to also hold
// progressModalOpen/openProgressModal/closeProgressModal, backing the
// header's "Progress" button and ProgressModal.tsx. Both the button (in
// TopBar.tsx and Dashboard.tsx) and the modal component itself have been
// removed, so this state had no remaining reader — removed here rather
// than left as dead state. The underlying progress data/tracking is
// untouched (progressStore.ts, /api/progress/my-summary) and still powers
// the Profile page, the dedicated /progress page, badges, and the
// Knowledge Map.
interface UiState {
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Teacher portal's own mobile nav drawer — deliberately separate from
  // the student drawerOpen above (different layout, different content),
  // and deliberately NOT persisted: the teacher sidebar is docked open on
  // desktop/tablet by default (see TeacherSidebar.tsx's md:flex), this
  // only matters on narrow screens, and always starting closed there
  // avoids a returning teacher on mobile seeing an overlay cover the
  // dashboard before they asked for it.
  teacherDrawerOpen: boolean;
  openTeacherDrawer: () => void;
  closeTeacherDrawer: () => void;
  toggleTeacherDrawer: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      drawerOpen: true,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

      teacherDrawerOpen: false,
      openTeacherDrawer: () => set({ teacherDrawerOpen: true }),
      closeTeacherDrawer: () => set({ teacherDrawerOpen: false }),
      toggleTeacherDrawer: () => set((s) => ({ teacherDrawerOpen: !s.teacherDrawerOpen })),
    }),
    {
      name: "neuronlp-nexus-ui",
      // Only the drawer's open/closed state is worth remembering across
      // reloads — the palette should always start closed.
      partialize: (s) => ({ drawerOpen: s.drawerOpen }),
    },
  ),
);
