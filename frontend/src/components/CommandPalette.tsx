import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { NAV_ITEMS } from "../utils/navigation";
import { useUiStore } from "../store/uiStore";

/**
 * Global Ctrl/Cmd+K command palette. Searches the same NAV_ITEMS array the
 * sidebar renders from, so it's never out of sync with real routes — it
 * can't offer a destination that doesn't exist. Navigating to a
 * phase-planned item is honest too: it lands on the real PhasePlaceholder
 * for that route, not a fake result.
 */
export default function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const openPalette = useUiStore((s) => s.openCommandPalette);
  const closePalette = useUiStore((s) => s.closeCommandPalette);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = NAV_ITEMS.filter((item) => item.path !== "/");
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape") closePalette();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPalette, closePalette]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const go = (path: string) => {
    navigate(path);
    closePalette();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      go(results[activeIndex].path);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={closePalette}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-nexus-border">
          <Search size={16} className="text-nexus-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search labs, tools, pages…"
            className="flex-1 bg-transparent text-sm text-nexus-text placeholder:text-nexus-muted focus:outline-none"
          />
          <kbd className="text-[10px] text-nexus-muted border border-nexus-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-nexus-muted">No matches.</p>
          )}
          {results.map((item, i) => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                i === activeIndex ? "bg-nexus-accent/15 text-nexus-text" : "text-nexus-muted"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={15} className={i === activeIndex ? "text-nexus-accent" : "text-nexus-muted"} />
                {item.label}
              </span>
              {item.status === "phase-planned" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-surfaceAlt border border-nexus-border text-nexus-muted shrink-0">
                  Planned
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
