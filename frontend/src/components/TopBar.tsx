import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";

import DomainSwitcher from "./DomainSwitcher";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { checkHealth } from "../services/api";
import { useApiStatusStore } from "../store/apiStatusStore";
import { useAuthStore } from "../store/authStore";
import { useProgressStore } from "../store/progressStore";
import { useUiStore } from "../store/uiStore";
import { useBirthdayStore } from "../store/birthdayStore";
import { useChatStore } from "../store/chatStore";
import { useCommunityStore } from "../store/communityStore";

// How often to actively re-check while nothing else is exercising the API
// (see apiStatusStore.ts for the other half: every real request updates
// this too, immediately, not just on this interval).
const HEALTH_POLL_MS = 15_000;

// A notification bell was part of the originally requested top bar, but
// there's no notification system to back it — adding a control that
// doesn't actually do anything would be exactly the kind of decorative-
// but-fake UI this project is trying to avoid, so it stays out until
// there's something real behind it. The theme toggle, added for the dual
// Light/Dark/System theme system, is real (see ThemeToggle.tsx /
// themeStore.ts). The account control is real as of Milestone 17 (real
// backend auth).
//
// Redesign Stage 1: added the drawer-toggle (menu) button on the left —
// the old permanently-docked Sidebar is now a collapsible overlay, opened
// from here instead of always taking up 16rem of width.
//
// "Remove the Progress button from the UI" pass: this header used to also
// have a compact "Progress" button (next to Notifications) showing a live
// NLP/DL average percentage and opening ProgressModal. It's been removed
// entirely per that request — not hidden with CSS — along with
// ProgressModal.tsx itself (nothing else opened it) and the now-dead
// progressModalOpen/openProgressModal/closeProgressModal state in
// uiStore.ts. refreshProgress() below is kept: it's the app-wide prefetch
// that populates progressStore on login, which the Dashboard's NEXI
// companion message, Profile page, Knowledge Map, and /progress page all
// still read from — none of that backend progress tracking was touched.
export default function TopBar() {
  const backendUp = useApiStatusStore((s) => s.backendUp);
  const openCommandPalette = useUiStore((s) => s.openCommandPalette);
  const toggleDrawer = useUiStore((s) => s.toggleDrawer);
  const { token, refreshUser } = useAuthStore();
  const refreshProgress = useProgressStore((s) => s.refresh);

  // A real, live, automatically-refreshing check (Milestone 19) — not the
  // one-shot mount-time check this used to be, which is exactly how it
  // used to go stale: it would say "connected" forever after a single
  // success at page load, even if the backend later went down. checkHealth()
  // itself doesn't need to be read here — its result flows through the
  // shared api.ts response interceptor into apiStatusStore, the same path
  // every other API call updates it through, so this indicator can never
  // disagree with what a real request just experienced.
  useEffect(() => {
    checkHealth().catch(() => {});
    const interval = setInterval(() => {
      checkHealth().catch(() => {});
    }, HEALTH_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();
  const connectChatSocket = useChatStore((s) => s.connectSocket);
  const disconnectChatSocket = useChatStore((s) => s.disconnectSocket);
  const wireCommunitySocket = useCommunityStore((s) => s.wireSocket);
  const loadNotifications = useCommunityStore((s) => s.loadNotifications);
  const unreadNotifications = useCommunityStore((s) => s.unreadNotificationCount);
  const loadBirthday = useBirthdayStore((s) => s.load);

  useEffect(() => {
    // Covers both a fresh login/register (handled there too, redundantly
    // but harmlessly) and a page reload with a token already persisted in
    // localStorage, which is the actual "restore progress on login" path
    // for a returning student who never logged out.
    if (token) {
      refreshUser();
      refreshProgress();
      // Community/Chat milestone: one shared WebSocket for the whole app,
      // opened once a real session token exists and closed the moment it
      // doesn't (logout, or an expired token refreshUser() just cleared).
      connectChatSocket(token);
      wireCommunitySocket();
      loadNotifications();
      // Birthday Experience milestone, point 4: "on every login/session" —
      // the backend's own notify_relevant_users already runs inside
      // login_user/auth.me (see backend/app/services/auth_service.py and
      // app/api/auth.py); this is the FRONTEND half of "every session,"
      // fetching the real, backend-computed isBirthdayToday + related
      // birthdays so the UI can react to it on every app load, not just
      // the moment of logging in.
      loadBirthday();
    } else {
      disconnectChatSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-nexus-border bg-nexus-bg/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleDrawer}
          title="Open learning navigation"
          className="shrink-0 flex items-center justify-center rounded-lg border border-nexus-border bg-nexus-surface p-2 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim transition-colors"
        >
          <Menu size={16} />
        </button>
        <DomainSwitcher />
      </div>

      <button
        onClick={openCommandPalette}
        className="hidden sm:flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-nexus-border bg-nexus-surface px-3 py-1.5 text-sm text-nexus-muted hover:border-nexus-accentDim hover:text-nexus-text transition-colors"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[10px] border border-nexus-border rounded px-1.5 py-0.5">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <div className="flex items-center gap-2 text-xs shrink-0">
        <button
          onClick={() => navigate("/notifications")}
          title="Notifications"
          className="relative flex items-center justify-center rounded-lg border border-nexus-border bg-nexus-surface p-2 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim transition-colors"
        >
          <Bell size={14} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-nexus-accent px-1 text-[9px] font-semibold text-white flex items-center justify-center">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>

        {/* "Remove internal diagnostics from the student UI" pass: this used
            to say "API Connected" / "API Offline — start the backend (see
            README)" with a tooltip naming the exact uvicorn command —
            meaningful to a developer, meaningless (or actively confusing)
            to a student, and it named internal architecture the spec
            explicitly doesn't want surfaced. Same real backendUp state,
            just shown as a plain connection dot with no backend/API/host
            wording, no commands, no paths. */}
        <div className="hidden sm:flex items-center gap-1.5" title={
          backendUp === false
            ? "Can't reach the learning platform right now — try again shortly."
            : "Learning platform services are reachable."
        }>
          {backendUp === null && (
            <span className="flex items-center gap-1.5 text-nexus-muted">
              <span className="h-2 w-2 rounded-full bg-nexus-muted" /> Checking…
            </span>
          )}
          {backendUp === true && (
            <span className="flex items-center gap-1.5 text-nexus-good">
              <span className="h-2 w-2 rounded-full bg-nexus-good" /> Connected
            </span>
          )}
          {backendUp === false && (
            <span className="flex items-center gap-1.5 text-nexus-bad">
              <span className="h-2 w-2 rounded-full bg-nexus-bad" /> Offline
            </span>
          )}
        </div>

        <div className="w-px h-4 bg-nexus-border mx-1" />

        <ThemeToggle />

        <div className="w-px h-4 bg-nexus-border mx-1" />

        <UserMenu />
      </div>
    </header>
  );
}
