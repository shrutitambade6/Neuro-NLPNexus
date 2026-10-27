import { create } from "zustand";

interface ApiStatusState {
  // null = not checked yet (first paint, before either the mount-time
  // health check or any real API call has resolved).
  backendUp: boolean | null;
  lastCheckedAt: number | null;
  markUp: () => void;
  markDown: () => void;
}

// Deliberately has ZERO import from services/api.ts (not even for the
// TypeScript types) — api.ts's response interceptor calls markUp/markDown
// on every real request, so if this file imported anything from api.ts we'd
// have a circular import (api.ts -> apiStatusStore.ts -> api.ts), the same
// hazard authStore.ts already documents avoiding by reading localStorage
// directly instead of importing authStore from api.ts.
//
// This is the single source of truth for "is the backend actually
// reachable right now" — TopBar's indicator, Register/Login's error
// copy, or anything else that cares, all read from here instead of each
// running their own one-off check. It's kept accurate two ways: an
// active poll (TopBar calls checkHealth() on an interval) AND passively,
// for free, by every real request the app makes — the moment any POST,
// GET, whatever gets a genuine network failure, this flips immediately,
// rather than waiting for the next scheduled poll.
export const useApiStatusStore = create<ApiStatusState>((set) => ({
  backendUp: null,
  lastCheckedAt: null,
  markUp: () => set({ backendUp: true, lastCheckedAt: Date.now() }),
  markDown: () => set({ backendUp: false, lastCheckedAt: Date.now() }),
}));
