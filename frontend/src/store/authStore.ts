import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  extractErrorDetail,
  fetchCurrentUser,
  loginAccount,
  registerAccount,
  type AuthUser,
  type EmailStatus,
} from "../services/api";
import { useBirthdayStore } from "./birthdayStore";
import { useCommunityStore } from "./communityStore";
import { useProgressStore } from "./progressStore";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  // Production-Ready Email Verification milestone (2026-10-28). Set
  // alongside `error` only for the one structured-detail case the
  // backend sends (EmailNotVerifiedError on /auth/login, code
  // "email_not_verified") — lets Login.tsx show a "Resend verification
  // email" action without pattern-matching the message text. Always
  // cleared together with `error`.
  errorCode: string | null;
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
    accountType?: "student" | "teacher",
    // Production-Ready Email Verification milestone (2026-10-28); see
    // registerAccount's own comment in services/api.ts.
    studentCategory?: "vit" | "general"
    // Production-Ready Email Verification milestone (2026-10-28).
    // "authenticated": verified/ungated account, real session issued —
    // Register.tsx should navigate into the app. "verify_pending": the
    // account was created but needs to verify its email first — NO
    // session was issued; Register.tsx must show the "check your inbox"
    // screen, never navigate into the dashboard. false: registration
    // itself failed; `error` explains why.
  ) => Promise<"authenticated" | "verify_pending" | false>;
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
      errorCode: null,
      loading: false,
      authChecked: false,
      lastEmailStatus: null,

      register: async (
        username,
        fullName,
        collegeEmail,
        password,
        confirmPassword,
        birthday,
        timezone,
        accountType,
        studentCategory
      ) => {
        set({ loading: true, error: null, errorCode: null });
        try {
          const data = await registerAccount(
            username,
            fullName,
            collegeEmail,
            password,
            confirmPassword,
            birthday,
            timezone,
            accountType,
            studentCategory
          );
          // Production-Ready Email Verification milestone (2026-10-28).
          // A null access_token means the backend deliberately issued NO
          // session — the account still has to verify its email. Store
          // the user (so Register.tsx can show/mask the address and the
          // pending state) but leave `token` untouched: there is no
          // session to set, and ProtectedRoute must keep treating this
          // visitor as signed out until they actually verify and log in.
          if (!data.access_token) {
            set({ user: data.user, loading: false, lastEmailStatus: data.email_status });
            return "verify_pending";
          }
          set({ token: data.access_token, user: data.user, loading: false, lastEmailStatus: data.email_status });
          useProgressStore.getState().refresh();
          // Birthday Experience milestone, point 4 — loaded here (not just
          // from the student TopBar, which an admin account never mounts)
          // so "every login/session" genuinely covers BOTH roles. Harmless
          // if TopBar also triggers it moments later for a student.
          useBirthdayStore.getState().load();
          return "authenticated";
        } catch (e) {
          const { message, code } = extractErrorDetail(e);
          set({ error: message, errorCode: code ?? null, loading: false });
          return false;
        }
      },

      login: async (username, password, accountType) => {
        set({ loading: true, error: null, errorCode: null });
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
          // Production-Ready Email Verification milestone (2026-10-28) --
          // a blocked, unverified-email login comes back as a structured
          // {message, code: "email_not_verified"} detail (see
          // app.api.auth's EmailNotVerifiedError handling); every other
          // login failure is still the plain string it always was.
          // extractErrorDetail normalizes both, so Login.tsx can check
          // `errorCode` without string-matching `error`.
          const { message, code } = extractErrorDetail(e);
          set({ error: message, errorCode: code ?? null, loading: false });
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
        set({ token: null, user: null, error: null, errorCode: null });
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

      clearError: () => set({ error: null, errorCode: null }),
    }),
    {
      name: "nlp-nexus-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
