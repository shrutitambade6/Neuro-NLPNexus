import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useThemeStore, type ThemeMode } from "../store/themeStore";

const OPTIONS: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "system", label: "System", icon: Monitor },
];

// The header's instant Light/Dark switch and the "Appearance: Light / Dark
// / System" setting are the same real control here, not two separate UIs —
// there's no dedicated Settings page in this app yet, and duplicating the
// choice in two places would only risk them drifting out of sync. Clicking
// Light or Dark switches instantly (no reload — see themeStore, it just
// flips a CSS attribute); System hands control back to the OS preference
// and keeps following it live.
export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="relative flex items-center gap-0.5 rounded-lg border border-nexus-border bg-nexus-surface p-0.5 shrink-0"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        const Icon = opt.icon;
        return (
          <button
            key={opt.mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${opt.label} theme`}
            onClick={() => setMode(opt.mode)}
            className="relative flex h-6 w-7 items-center justify-center rounded-md"
          >
            {active && (
              <motion.span
                layoutId="theme-toggle-active"
                className="absolute inset-0 rounded-md bg-nexus-accent/15 border border-nexus-accent/40"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
              />
            )}
            <motion.span
              animate={{ rotate: active ? 0 : -25, scale: active ? 1 : 0.85 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative flex items-center justify-center transition-colors duration-200 ${
                active ? "text-nexus-accent" : "text-nexus-muted hover:text-nexus-text"
              }`}
            >
              <Icon size={13} />
            </motion.span>
            <span className="sr-only">{opt.label} theme</span>
          </button>
        );
      })}
    </div>
  );
}
