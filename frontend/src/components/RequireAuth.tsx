import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";

import { useAuthStore } from "../store/authStore";

// SUPERSEDED — no longer imported anywhere (left in place rather than
// deleted; see project precedent of not removing harmless orphaned files
// for a cosmetic cleanup). Originally: Task 1 ("fix authentication /
// protected content") wrapped every protected page's <element> in this
// component INSIDE StudentLayout's always-mounted route. That's exactly
// how a guest could end up seeing the Sidebar/TopBar chrome rendered
// around this "Login required" card — the chrome mounted regardless, only
// the inner content swapped.
//
// The "guest sees the authenticated sidebar" follow-up fix replaced this
// per-page pattern with route-level gating: App.tsx now nests all
// protected pages under <Route element={<ProtectedRoute />}><Route
// element={<StudentLayout />}>...</Route></Route> (see
// ProtectedRoute.tsx), so StudentLayout itself never mounts for a guest —
// the same wrap-the-layout pattern RequireAdmin/RequireSuperAdmin already
// used for /admin and /super-admin. Do not re-introduce this component as
// a per-page wrapper; it reintroduces the original bug.
//
// Client-side gating was always only a convenience, never the real
// security boundary — the matching backend half is each API router's own
// require_user dependency (app/api/deps.py), independent of anything the
// frontend renders.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-nexus-border bg-nexus-surface p-8 text-center space-y-4">
        <Lock size={28} className="mx-auto text-nexus-accent" />
        <h1 className="text-lg font-semibold">Login required</h1>
        <p className="text-sm text-nexus-muted">
          You need to sign in to access your learning dashboard and course content.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            state={{ from: location }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-nexus-accent px-4 py-2 text-sm font-medium text-white hover:bg-nexus-accent/90"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-4 py-2 text-sm font-medium hover:bg-nexus-bg"
          >
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  // user === null briefly while /auth/me is still loading after a refresh —
  // we gate on the token alone (not the resolved user object) so a
  // just-refreshed page with a persisted token never flashes this screen
  // for a split second before /auth/me resolves. If the token turns out to
  // be invalid/expired, authStore.refreshUser() clears it and this screen
  // then shows on the next render — same pattern as RequireAdmin.
  return <>{children}</>;
}
