import { create } from "zustand";

// Dev-only request/response log for the API Diagnostics Panel
// (components/ApiDiagnosticsPanel.tsx). Added while debugging a real
// "Couldn't reach the backend" report on Sign Up — the goal is to make
// "frontend never sent it" vs "sent it but got no response" vs "backend
// answered with an error" immediately visually distinguishable, instead of
// everyone staring at one generic red banner.
//
// Deliberately NOT persisted (this is live debugging state, not app state)
// and deliberately has zero import from services/api.ts for the same
// circular-import reason apiStatusStore.ts documents — api.ts imports this
// store, not the other way around.
export interface ApiLogEntry {
  id: number;
  method: string;
  path: string;
  // One of: a real HTTP status code, or a short classification of a
  // response-less failure (e.g. "ECONNREFUSED", "Network Error", "Timeout").
  status: number | string;
  ok: boolean;
  timestamp: number;
}

interface ApiDiagnosticsState {
  entries: ApiLogEntry[];
  databaseStatus: "connected" | "unknown" | string;
  nextId: number;
  logRequest: (entry: Omit<ApiLogEntry, "id" | "timestamp">) => void;
  setDatabaseStatus: (status: string) => void;
}

const MAX_ENTRIES = 8;

export const useApiDiagnosticsStore = create<ApiDiagnosticsState>((set, get) => ({
  entries: [],
  databaseStatus: "unknown",
  nextId: 1,
  logRequest: (entry) => {
    const id = get().nextId;
    const full: ApiLogEntry = { ...entry, id, timestamp: Date.now() };
    set((s) => ({
      entries: [full, ...s.entries].slice(0, MAX_ENTRIES),
      nextId: id + 1,
    }));
    // Mirrors the panel's own display as plain console output, per the
    // explicit "panel OR console logging" dev-diagnostics request — so the
    // same information is available even if the panel is collapsed/missed.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(
        `[API] ${entry.method} ${entry.path} -> ${entry.ok ? "" : "Error: "}${entry.status}`
      );
    }
  },
  setDatabaseStatus: (status) => set({ databaseStatus: status }),
}));
