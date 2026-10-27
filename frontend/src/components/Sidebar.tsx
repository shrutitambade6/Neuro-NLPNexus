import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BrainCircuit, ChevronRight, Lock, ShieldCheck, X } from "lucide-react";

import { useAuthStore } from "../store/authStore";
import { useDomainStore } from "../store/domainStore";
import { useProgressStore } from "../store/progressStore";
import { useUiStore } from "../store/uiStore";
import { BOOK_ACCENT_CLASSES } from "../utils/bookAccents";
import {
  DL_GROUPS,
  DOMAIN_META,
  NAV_ITEMS,
  NAV_SECTIONS,
  NLP_GROUPS,
  type NavGroup,
} from "../utils/navigation";

// Sidebar Redesign: the old drawer rendered the "nlp" and "dl" sections as
// one long flat list each (8 items apiece — NLP Foundations through
// Discourse Lab, DL Foundations through Attention & Transformers). That
// forced scrolling past 16+ individual pages just to reach Debug-style
// utility links at the bottom. Nothing about those 16 pages/routes
// changed — NAV_ITEMS, App.tsx's routes, and CommandPalette's flat search
// are all untouched. What changed is purely how the "nlp"/"dl" sections
// are PRESENTED here: as two collapsible accordion rows (collapsed by
// default, one open at a time), each grouping its same 8 real items into
// 2-4 short named categories (NLP_GROUPS/DL_GROUPS in utils/navigation.ts)
// instead of one flat list. Every other section (Community, Applications,
// Practice, Resources, Account) renders exactly as it did before.
function domainSubtitle(total: number, completed: number | null): string {
  const moduleWord = `${total} module${total === 1 ? "" : "s"}`;
  // Real backend progress when available (see useProgressStore /
  // /api/progress/my-summary) — never a hardcoded or guessed number. If
  // progress hasn't loaded yet (e.g. a guest session, or the app-wide
  // prefetch in TopBar.tsx hasn't resolved), fall back to just the module
  // count, exactly as the spec asked: "If progress data is not available,
  // show only 'N modules'."
  if (completed == null) return moduleWord;
  return `${moduleWord} · ${completed} completed`;
}

function DomainAccordion({
  id,
  groups,
  totalCount,
  completedCount,
  expanded,
  currentPath,
  onToggle,
  onNavigate,
}: {
  id: "nlp" | "dl";
  groups: NavGroup[];
  totalCount: number;
  completedCount: number | null;
  expanded: boolean;
  currentPath: string;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const meta = DOMAIN_META[id];
  const accent = BOOK_ACCENT_CLASSES[meta.accent];
  const Icon = meta.icon;
  // "Is my own domain currently open" governs the row's own highlight;
  // whether the active PAGE happens to be inside this domain (used for the
  // route-aware auto-expand effect in the parent) is a separate question
  // handled there, not here.
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
          expanded ? accent.bgSoft : "hover:bg-nexus-surfaceAlt"
        }`}
      >
        <Icon size={18} className={`shrink-0 ${accent.text}`} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-tight text-nexus-text">{meta.label}</span>
          <span className="block text-[11px] leading-tight text-nexus-muted mt-0.5">
            {domainSubtitle(totalCount, completedCount)}
          </span>
        </span>
        <ChevronRight
          size={15}
          className={`shrink-0 text-nexus-muted transition-transform duration-200 ease-out ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`ml-[18px] border-l pl-3 pt-1 pb-1.5 space-y-2.5 ${accent.border}`}>
              {groups.map((group) => (
                <div key={group.category}>
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-nexus-muted/70">
                    {group.category}
                  </p>
                  <div className="space-y-0.5">
                    {group.paths.map((path) => {
                      const item = NAV_ITEMS.find((i) => i.path === path);
                      if (!item) return null; // grouping metadata only ever references real NAV_ITEMS
                      const isActive = currentPath === path;
                      return (
                        <NavLink
                          key={path}
                          to={path}
                          onClick={onNavigate}
                          className={`group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] border-l-2 transition-all duration-150 ${
                            isActive
                              ? `${accent.border} ${accent.bgSoft} text-nexus-text`
                              : "border-transparent text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt hover:translate-x-0.5"
                          }`}
                        >
                          <item.icon
                            size={13}
                            className={isActive ? accent.text : "text-nexus-muted/80 group-hover:text-nexus-text"}
                          />
                          {item.label}
                          {item.status === "phase-planned" && (
                            <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-nexus-surfaceAlt border border-nexus-border text-nexus-muted shrink-0">
                              Planned
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const domain = useDomainStore((s) => s.domain);
  const drawerOpen = useUiStore((s) => s.drawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const summary = useProgressStore((s) => s.summary);
  const location = useLocation();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  // Collapsed by default (point 6 of the redesign spec). Only one domain
  // accordion stays open at a time — clicking the other closes this one.
  const [expandedDomain, setExpandedDomain] = useState<"nlp" | "dl" | null>(null);

  const nlpPaths = useMemo(() => NLP_GROUPS.flatMap((g) => g.paths), []);
  const dlPaths = useMemo(() => DL_GROUPS.flatMap((g) => g.paths), []);

  // Route-aware auto-expand (point 13): landing directly on a page that
  // lives inside the NLP or DL accordion opens that domain automatically.
  // Visiting anything else (Dashboard, Concept DNA, Real-World NLP, a book,
  // Profile, ...) leaves whatever the student last had open exactly as it
  // was — it does not force both closed on every unrelated navigation.
  useEffect(() => {
    if (nlpPaths.includes(location.pathname)) setExpandedDomain("nlp");
    else if (dlPaths.includes(location.pathname)) setExpandedDomain("dl");
  }, [location.pathname, nlpPaths, dlPaths]);

  const toggleDomain = (id: "nlp" | "dl") =>
    setExpandedDomain((prev) => (prev === id ? null : id));

  const nlpTotal = summary?.nlp_progress.total ?? nlpPaths.length;
  const nlpCompleted = summary?.nlp_progress.completed ?? null;
  const dlTotal = summary?.dl_progress.total ?? dlPaths.length;
  const dlCompleted = summary?.dl_progress.completed ?? null;

  // Same "lead with whichever domain the student is currently focused on"
  // ordering the old sidebar used, preserved here for the two accordion
  // rows themselves.
  const domainOrder: ("nlp" | "dl")[] = domain === "nlp" ? ["nlp", "dl"] : ["dl", "nlp"];

  const otherSections = NAV_SECTIONS.filter(
    (s) => s.id !== "command" && s.id !== "nlp" && s.id !== "dl",
  );
  const commandSection = NAV_SECTIONS.find((s) => s.id === "command");

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer-panel"
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-nexus-border bg-nexus-surface shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Learning navigation"
          >
            <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-nexus-border">
              <Link to="/" onClick={closeDrawer} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <BrainCircuit className="text-nexus-accent" size={22} />
                <div>
                  <p className="font-display font-semibold text-sm leading-tight">NeuroNLP Nexus</p>
                  <p className="text-[11px] text-nexus-muted leading-tight">Interactive NLP & Deep Learning Lab</p>
                </div>
              </Link>
              <button
                onClick={closeDrawer}
                title="Close menu"
                className="text-nexus-muted hover:text-nexus-text rounded-lg p-1.5 hover:bg-nexus-surfaceAlt transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {/* Command section: Dashboard, Concept DNA (Home excluded —
                  reachable via the brand link above, same as before). */}
              {commandSection &&
                NAV_ITEMS.filter((item) => item.section === "command" && item.path !== "/").map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeDrawer}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-lg pl-3 pr-3 py-2 ml-0.5 mb-0.5 text-sm border-l-2 transition-all duration-200 ${
                        isActive
                          ? "border-nexus-gold bg-nexus-accent/10 text-nexus-text"
                          : "border-transparent text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt hover:translate-x-0.5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          size={16}
                          className={`transition-colors ${
                            isActive
                              ? "text-nexus-accent drop-shadow-[0_0_6px_rgb(var(--nexus-accent)/var(--nexus-glowAlpha))]"
                              : "text-nexus-muted group-hover:text-nexus-accent"
                          }`}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}

              {/* The two collapsible domain accordions — the heart of this
                  redesign. "LEARNING" renders once, above both. */}
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-nexus-muted/70">
                Learning
              </p>
              {domainOrder.map((id) =>
                id === "nlp" ? (
                  <DomainAccordion
                    key="nlp"
                    id="nlp"
                    groups={NLP_GROUPS}
                    totalCount={nlpTotal}
                    completedCount={nlpCompleted}
                    expanded={expandedDomain === "nlp"}
                    currentPath={location.pathname}
                    onToggle={() => toggleDomain("nlp")}
                    onNavigate={closeDrawer}
                  />
                ) : (
                  <DomainAccordion
                    key="dl"
                    id="dl"
                    groups={DL_GROUPS}
                    totalCount={dlTotal}
                    completedCount={dlCompleted}
                    expanded={expandedDomain === "dl"}
                    currentPath={location.pathname}
                    onToggle={() => toggleDomain("dl")}
                    onNavigate={closeDrawer}
                  />
                ),
              )}

              {/* Every other section (Community, Applications, Practice,
                  Resources, Account) is unchanged — same flat rendering as
                  the original sidebar, same items, same order. */}
              {otherSections.map((section) => {
                const items = NAV_ITEMS.filter((item) => item.section === section.id && item.path !== "/");
                if (items.length === 0) return null;
                return (
                  <div key={section.id} className="mb-1">
                    {section.label && (
                      <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-nexus-muted/70">
                        {section.label}
                      </p>
                    )}
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={closeDrawer}
                          className={({ isActive }) =>
                            `group relative flex items-center justify-between gap-2 rounded-lg pl-3 pr-3 py-2 ml-0.5 text-sm border-l-2 transition-all duration-200 ${
                              isActive
                                ? "border-nexus-gold bg-nexus-accent/10 text-nexus-text"
                                : "border-transparent text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt hover:translate-x-0.5"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span className="flex items-center gap-2.5">
                                <item.icon
                                  size={16}
                                  className={`transition-colors ${
                                    isActive
                                      ? "text-nexus-accent drop-shadow-[0_0_6px_rgb(var(--nexus-accent)/var(--nexus-glowAlpha))]"
                                      : "text-nexus-muted group-hover:text-nexus-accent"
                                  }`}
                                />
                                {item.label}
                              </span>
                              {item.status === "phase-planned" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexus-surfaceAlt border border-nexus-border text-nexus-muted shrink-0">
                                  Planned
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Only ever rendered for the one seeded admin account
                (role="admin") — a student never sees this link, and even
                if they typed /admin directly, RequireAdmin + the backend's
                own require_admin dependency both refuse it regardless of
                what the drawer shows. */}
            {user?.role === "admin" && (
              <div className="px-2 pb-2">
                <NavLink
                  to="/admin"
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-nexus-accent/10 text-nexus-text"
                        : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt"
                    }`
                  }
                >
                  <ShieldCheck size={16} className="text-nexus-accent" />
                  Teacher Dashboard
                </NavLink>
              </div>
            )}

            {/* Super Admin Portal milestone. Only ever rendered for the one
                seeded super_admin account — same reasoning as the Teacher
                Dashboard link above, just a different destination with its
                own completely separate layout/nav (SuperAdminLayout). */}
            {user?.role === "super_admin" && (
              <div className="px-2 pb-2">
                <NavLink
                  to="/super-admin"
                  onClick={closeDrawer}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-nexus-accent/10 text-nexus-text"
                        : "text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt"
                    }`
                  }
                >
                  <Lock size={16} className="text-nexus-accent" />
                  Super Admin Portal
                </NavLink>
              </div>
            )}

            <div className="px-4 py-3 border-t border-nexus-border text-[11px] text-nexus-muted">
              {user ? `Signed in as ${user.username}${user.role === "admin" ? " (admin)" : ""}` : "v0.1.0 · Guest session"}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
