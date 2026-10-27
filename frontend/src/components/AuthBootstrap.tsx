import { useEffect } from "react";

import { useAuthStore } from "../store/authStore";

// Platform Hardening follow-up — "guest sees the authenticated sidebar"
// fix. Runs once, at the very top of the app (mounted in App.tsx next to
// PreferencesEffects, outside both PublicLayout and the protected
// StudentLayout tree), so a persisted-but-possibly-stale token from
// localStorage gets verified against the real backend BEFORE
// ProtectedRoute (./ProtectedRoute.tsx) decides whether to render the
// student app shell. Without this, ProtectedRoute would have to trust
// the raw presence of a token — which only proves "this browser logged in
// at some point," never that the session is still valid, and a database
// row for a past account is never, on its own, an active session.
//
// Renders nothing — ProtectedRoute is what shows the small loading state
// while authChecked is still false (see its own comment).
export default function AuthBootstrap() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
