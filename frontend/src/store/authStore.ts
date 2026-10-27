import { create } from "zustand";
import { persist } from "zustand/middleware";

import { fetchCurrentUser, loginAccount, registerAccount, type AuthUser, type EmailStatus } from "../services/api";
import { useBirthdayStore } from "./birthdayStore";
import { useCommunityStore } from "./communityStore";
import { useProgressStore } from "./progressStore";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  loading: boolean;
  // False only for the brief window between app boot and initAuth()
  // resolving (see below). ProtectedRoute reads this — not just `token` —
  // so a page refresh with a persisted-but-now-expired token shows a small
  // loading state and THEN redirects to /login, instead of either flashing
  // the authenticated app shell for a frame or redirecting before the
  // token has actually been checked against the backend.
  authChecked: boolean;
  // Transient (not persisted) — the honest outcome of the welcome email the
  // backend just tried to send during the most recent register() call, so
  // Register.tsx can show a toast that matches what actually happened
  // rather than always claiming "check your email".
  lastEmailStatus: EmailStatus;
  register: (
    username: string,
    fullName: string,
    // College-email requirement (2026-10-08); see registerAccount's own
    // comment in services/api.ts.
    collegeEmail: string,
    password: string,
    confirmPassword: string,
    // Birthday Experience milestone — both optional; see RegisterRequest.
    birthday?: string | null,
    timezone?: string | null,
    // Student/Teacher self-serve signup follow-up; see registerAccount's
    // own comment in services/api.ts.
    accountType?: "student" | "teacher"
  ) => Promise<boolean>;
  login: (username: string, password: string, accountType?: "student" | "teacher") => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  // Runs exactly once, at app boot (see components/AuthBootstrap.tsx). A
  // persisted token in localStorage only proves a session existed in THIS
  // browser before — never that it's still valid, and never that "a user
  // row exists in the database" should be treated as "someone is signed in
  // right now" (those are not the same thing). This is the one place that
  // turns a merely-persisted token into a verified one, by asking the
  // backend; refreshUser() above does the same verification but is for
  // later, already-rendered-app re-checks, not the initial boot gate.
  initAuth: () => Promise<void>;
  clearError: () => void;
}

// Real auth backed by the FastAPI /auth endpoints (PBKDF2 password hashing,
// signed HS256 JWTs). The token is the actual bearer token the backend
// issued — nothing here is a mocked/local-only "logged in" flag. Persisted
// under "nlp-nexus-auth" (see the localStorage key api.ts's interceptor
// reads) so a page refresh doesn't sign the user out.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      error: null,
      loading: false,
      authChecked: false,
      lastEmailStatus: null,

      register: async (username, fullName, collegeEmail, password, confirmPassword, birthday, timezone, accountType) => {
        set({ loading: true, error: null });
        try {
          const data = await registerAccount(username, fullName, collegeEmail, password, confirmPassword, birthday, timezone, accountType);
          set({ token: data.access_token, user: data.user, loading: false, lastEmailStatus: data.email_status });
          useProgressStore.getState().refresh();
          // Birthday Experience milestone, point 4 — loaded here (not just
          // from the student TopBar, which an admin account never mounts)
          // so "every login/session" genuinely covers BOTH roles. Harmless
          // if TopBar also triggers it moments later for a student.
          useBirthdayStore.getState().load();
          return true;
        } catch (e) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          set({ error: detail ?? "Couldn't reach the backend.", loading: false });
          return false;
        }
      },

      login: async (username, password, accountType) => {
        set({ loading: true, error: null });
        try {
          const data = await loginAccount(username, password, accountType);
          set({ token: data.access_token, user: data.user, loading: false });
          // Real progress restore: the next render of the dashboard/lab
          // pages reads this same store, already populated from the
          // backend's own rows for this account — not anything cached
          // locally from a previous session.
          useProgressStore.getState().refresh();
          useBirthdayStore.getState().load();
          return true;
        } catch (e) {
          const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          set({ error: detail ?? "Couldn't reach the backend.", loading: false });
          return false;
        }
      },

      // The one real place a session ends — called directly by every
      // Logout button (student/teacher/super-admin all route through this
      // same action) AND by refreshUser()'s catch below for a token that
      // expired/was invalidated server-side. Clearing just token/user here
      // is not enough: progressStore (NLP/DL stat cards) and
      // communityStore (discussions/notifications/unread count) hold the
      // PREVIOUS account's real data in memory, and nothing else re-fetches
      // them until the next successful login — so without this, a second
      // account signing in on the same tab/browser could see a flash of
      // (or, if they never trigger a refetch, keep seeing) the first
      // account's notifications/progress. chatStore clears itself
      // reactively off this same `token` transition (see TopBar.tsx's
      // effect), so it isn't duplicated here.
      logout: () => {
        set({ token: null, user: null, error: null });
        useProgressStore.getState().clear();
        useCommunityStore.getState().reset();
        useBirthdayStore.getState().reset();
      },

      refreshUser: async () => {
        if (!get().token) return;
        try {
          const user = await fetchCurrentUser();
          set({ user });
        } catch {
          // Token expired or invalid server-side — sign out locally too,
          // and clear exactly what logout() clears (see its comment) so an
          // expired token can never leave stale progress/notifications
          // visible once a different account signs in on this tab.
          set({ token: null, user: null });
          useProgressStore.getState().clear();
          useCommunityStore.getState().reset();
          useBirthdayStore.getState().reset();
        }
      },

      // The boot-time session check. A token restored from localStorage by
      // zustand's persist middleware means only "this browser logged in at
      // some point" — it does not mean the session is still valid, and it
      // is never derived from the existence of a user account in the
      // database (there is no fallback anywhere that treats "a row exists
      // in the users table" as "this visitor is authenticated"). The only
      // thing that can set authChecked back to true with a real user
      // attached is the backend actually answering /auth/me for the
      // persisted token.
      initAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ authChecked: true });
          return;
        }
        try {
          const user = await fetchCurrentUser();
          set({ user, authChecked: true });
          // Covers a page refresh with an already-valid persisted token —
          // the other half of "every login/session," and the ONLY path
          // that ever runs for an admin account, which never mounts the
          // student TopBar.tsx that otherwise triggers this.
          useBirthdayStore.getState().load();
        } catch {
          // Expired/invalid/revoked — never leave a stale token+user
          // sitting in the persisted store for ProtectedRoute to trust on
          // the next reload.
          set({ token: null, user: null, authChecked: true });
          useProgressStore.getState().clear();
          useCommunityStore.getState().reset();
          useBirthdayStore.getState().reset();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "nlp-nexus-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
