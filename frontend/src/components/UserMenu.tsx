import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Settings, User, UserCircle } from "lucide-react";

import { useAuthStore } from "../store/authStore";

// Redesign Stage 2: the old TopBar just showed the username next to a bare
// logout icon. Now that there's a real Profile page and a real Settings
// page to link to (spec points 3/4), the username becomes a small
// dropdown — same logout action as before, plus the two new destinations.
interface Props {
  // Lets the teacher portal point this exact same dropdown at its own
  // /admin/profile and /admin/settings pages instead of the student
  // ones, without forking the component.
  profilePath?: string;
  profileLabel?: string;
  settingsPath?: string;
}

export default function UserMenu({ profilePath = "/profile", profileLabel = "My Profile", settingsPath = "/settings" }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg border border-nexus-border px-3 py-1 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
      >
        Sign in
      </Link>
    );
  }

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hidden sm:flex items-center gap-1.5 text-nexus-text rounded-lg px-1.5 py-1 hover:bg-nexus-surfaceAlt transition-colors"
      >
        <User size={14} className="text-nexus-accent" />
        {user.username}
        <ChevronDown size={12} className={`text-nexus-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {/* Mobile fallback: no room for the username, just the icon. */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="sm:hidden flex items-center justify-center rounded-lg p-1.5 hover:bg-nexus-surfaceAlt transition-colors"
      >
        <User size={14} className="text-nexus-accent" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-nexus-border bg-nexus-surface shadow-2xl overflow-hidden z-30"
          >
            <Link
              to={profilePath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt transition-colors"
            >
              <UserCircle size={14} /> {profileLabel}
            </Link>
            <Link
              to={settingsPath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt transition-colors"
            >
              <Settings size={14} /> Settings
            </Link>
            <div className="h-px bg-nexus-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-nexus-muted hover:text-nexus-bad hover:bg-nexus-surfaceAlt transition-colors text-left"
            >
              <LogOut size={14} /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
