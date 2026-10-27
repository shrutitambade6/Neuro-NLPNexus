import { create } from "zustand";

import { fetchMySummary, type MySummary } from "../services/api";

// Not persisted to localStorage on purpose — this is a cache of real
// server state (see /api/progress/my-summary), and the server is always
// the source of truth. Re-fetched on sign-in and after every recorded
// completion/quiz result, which is also what "restore previous progress
// on login" actually means here: it's the real backend rows coming back,
// not anything cached client-side surviving a logout.
interface ProgressState {
  summary: MySummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
  isLessonComplete: (domain: "nlp" | "dl", moduleId: string) => boolean;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  summary: null,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const summary = await fetchMySummary();
      set({ summary, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clear: () => set({ summary: null }),

  isLessonComplete: (domain, moduleId) => {
    const ids = get().summary?.completed_module_ids?.[domain] ?? [];
    return ids.includes(moduleId);
  },
}));
