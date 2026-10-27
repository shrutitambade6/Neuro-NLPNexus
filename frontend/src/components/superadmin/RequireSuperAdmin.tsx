import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuthStore } from "../../store/authStore";

// Client-side gating only hides the /super-admin link for the wrong
// audience — same honest caveat as RequireAdmin.tsx. Every single
// /api/superadmin/* endpoint re-checks role="super_admin" server-side
// (require_super_admin, backend/app/api/deps.py) and refuses with a real
// 403 regardless of what this component renders. There is no path to any
// Super Admin data without the real backend agreeing the signed-in
// account is THE Super Admin account — never a Teacher, never a Student,
// however many of either exist.
export default function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  if (!token) return <Navigate to="/login" replace />;

  if (user && user.role !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-2">
          <ShieldAlert size={28} className="mx-auto text-rose-400" />
          <h1 className="text-lg font-semibold text-slate-100">This area is restricted</h1>
          <p className="text-sm text-slate-400">
            /super-admin is for the platform's one Super Admin account only. Your account doesn't
            have Super Admin access — this isn't your Teacher or Student account's role, and
            nothing here will load for it.
          </p>
        </div>
      </div>
    );
  }

  // user === null briefly while /auth/me is still loading after a refresh.
  return <>{children}</>;
}
