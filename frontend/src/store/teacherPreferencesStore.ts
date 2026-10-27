import { create } from "zustand";
import { persist } from "zustand/middleware";

// Teacher Settings' one real "notification preference": whether the
// sidebar's "Needs Attention" link shows a live count badge. There is no
// email/SMS notification backend in this project (deliberately — adding
// one would be real scope creep beyond what the spec's data model calls
// for), so this toggle controls something genuinely wired up — the
// in-app badge — rather than a checkbox that claims to send email digests
// but doesn't.
interface TeacherPreferencesState {
  showAttentionBadge: boolean;
  setShowAttentionBadge: (value: boolean) => void;
}

export const useTeacherPreferencesStore = create<TeacherPreferencesState>()(
  persist(
    (set) => ({
      showAttentionBadge: true,
      setShowAttentionBadge: (value) => set({ showAttentionBadge: value }),
    }),
    { name: "neuronlp-nexus-teacher-preferences" },
  ),
);
