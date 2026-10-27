import { Link } from "react-router-dom";
import { Menu, ShieldCheck, Wifi, WifiOff } from "lucide-react";

import ThemeToggle from "../ThemeToggle";
import UserMenu from "../UserMenu";
import { useApiStatusStore } from "../../store/apiStatusStore";
import { useUiStore } from "../../store/uiStore";

// Deliberately simpler than the student TopBar: no command palette, no
// domain switcher (the teacher isn't "in" a domain), no personal Progress
// button — those are all student-learning concepts. Same real backend
// health indicator and theme toggle as the student app, so "is the API up"
// and "light/dark" stay one real, shared truth rather than two.
export default function TeacherTopBar() {
  const backendUp = useApiStatusStore((s) => s.backendUp);
  const toggleTeacherDrawer = useUiStore((s) => s.toggleTeacherDrawer);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-nexus-border bg-nexus-bg/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleTeacherDrawer}
          title="Open teacher navigation"
          className="md:hidden shrink-0 flex items-center justify-center rounded-lg border border-nexus-border bg-nexus-surface p-2 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim transition-colors"
        >
          <Menu size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-medium text-nexus-muted">
          <ShieldCheck size={15} className="text-nexus-accent" />
          <span className="hidden sm:inline">Teacher Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs shrink-0">
        <Link
          to="/"
          className="hidden sm:inline rounded-lg border border-nexus-border px-2.5 py-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim transition-colors"
        >
          Student view
        </Link>

        <div className="hidden sm:flex items-center gap-1.5">
          {backendUp === null && <span className="text-nexus-muted">Checking API…</span>}
          {backendUp === true && (
            <span className="flex items-center gap-1.5 text-nexus-good" title="The backend answered a real request just now.">
              <Wifi size={14} /> API Connected
            </span>
          )}
          {backendUp === false && (
            <span className="flex items-center gap-1.5 text-nexus-bad" title="A real request couldn't reach the backend.">
              <WifiOff size={14} /> API Offline
            </span>
          )}
        </div>

        <div className="w-px h-4 bg-nexus-border mx-1" />
        <ThemeToggle />
        <div className="w-px h-4 bg-nexus-border mx-1" />
        <UserMenu profilePath="/admin/profile" profileLabel="Teacher Profile" settingsPath="/admin/settings" />
      </div>
    </header>
  );
}
