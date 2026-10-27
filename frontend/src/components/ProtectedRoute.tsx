import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

// Platform Hardening follow-up — "guest sees the authenticated sidebar"
// fix. This is the actual fix: in App.tsx, every protected route is now
// nested under <Route element={<ProtectedRoute />}><Route
// element={<StudentLayout />}>...</Route></Route>, so StudentLayout (and
// therefore Sidebar/TopBar/the NLP+DL nav/the progress + profile controls)
// never even mounts for a guest — there is no frame where it renders and
// then gets hidden or redirected away. That's the same pattern
// RequireAdmin/RequireSuperAdmin already used for /admin and
// /super-admin (wrapping the LAYOUT, not each page) — this brings the
// student routes in line with it. The old per-page <RequireAuth> wrapper
// (components/RequireAuth.tsx) rendered its "Login required" card INSIDE
// an already-mounted StudentLayout, which is exactly how a guest could see
// the sidebar/top bar chrome before ever signing in.
//
// Auth is read from authStore's real token/user, backed by the FastAPI
// /auth endpoints — never from a hardcoded user, a username string, or
// the mere existence of an account in the database. A database row is not
// a session; only a verified token is.
export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const authChecked = useAuthStore((s) => s.authChecked);
  const location = useLocation();

  // AuthBootstrap.tsx's initAuth() hasn't resolved yet — this is the one
  // moment a persisted token's validity is still unknown. Showing nothing
  // chrome-free here (rather than rendering StudentLayout optimistically,
  // or redirecting before the check finishes) is what satisfies "don't
  // briefly show the guest layout and then randomly redirect" AND "don't
  // render the sidebar for an invalid session" at the same time.
  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nexus-bg text-nexus-muted text-sm">
        Checking your session…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
