import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

// Plain string, not JSON — the no-flash inline script in index.html reads
// this exact key with a plain localStorage.getItem before React (or even
// the stylesheet) has loaded, so both sides must agree on the format.
const STORAGE_KEY = "neuronlp-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function readStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : null;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

function applyToDocument(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

interface ThemeState {
  /** The user's actual preference: an explicit choice, or "system" to
   * always follow the OS. This is what gets persisted. */
  mode: ThemeMode;
  /** What's actually painted right now — always "light" or "dark", even
   * when mode is "system". Components that need a concrete theme (canvas
   * drawing, chart colors) read this, not `mode`. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** The header's instant switch: flips between light and dark, exiting
   * "system" mode the moment the user makes an explicit choice — matches
   * "after the user manually selects a theme, their choice takes
   * priority." */
  toggleTheme: () => void;
}

// On first visit (no stored choice yet), default straight to dark --
// 2026-10-08, changed from defaulting to "system" per explicit user
// report: opening the app in an InPrivate/incognito window (fresh
// profile, nothing stored) was showing light, because "system" mode
// resolves via the OS/browser's prefers-color-scheme, and some
// private-browsing contexts report that as light regardless of the
// actual OS setting. The ask was that EVERYONE sees dark on a brand-new
// visit, not "whatever the OS-preference media query happens to report."
// index.html's inline script mirrors this exact same fallback (see its
// own comment) so there's still no flash on first paint. Once the user
// picks explicitly -- including picking "System" itself, if they want to
// follow the OS -- readStoredMode() finds that real choice on every later
// load and this default is never consulted again.
const initialMode: ThemeMode = readStoredMode() ?? "dark";
const initialResolved = resolve(initialMode);
// index.html's inline script already set the right `data-theme` before
// this module ever runs (avoiding a flash of the wrong theme) — this just
// brings the store's own state in line with what's already on the page.
applyToDocument(initialResolved);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  resolvedTheme: initialResolved,
  setMode: (mode) => {
    const resolved = resolve(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
    applyToDocument(resolved);
    set({ mode, resolvedTheme: resolved });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().resolvedTheme === "dark" ? "light" : "dark";
    get().setMode(next);
  },
}));

// While the user is on "System", keep following the OS preference live —
// e.g. an OS that switches to dark mode at sunset should be reflected here
// without a reload, not just at the moment "System" was chosen.
if (typeof window !== "undefined" && window.matchMedia) {
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  const handleSystemChange = () => {
    if (useThemeStore.getState().mode !== "system") return;
    const resolved = resolve("system");
    applyToDocument(resolved);
    useThemeStore.setState({ resolvedTheme: resolved });
  };
  if (mql.addEventListener) {
    mql.addEventListener("change", handleSystemChange);
  } else if (mql.addListener) {
    // Safari < 14
    mql.addListener(handleSystemChange);
  }
}
