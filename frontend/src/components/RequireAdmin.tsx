import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { useAuthStore } from "../store/authStore";

// Client-side gating only makes the admin link disappear for the wrong
// audience — it is NOT the real security boundary. Every /api/admin/*
// endpoint re-checks role="admin" server-side (see backend/app/api/deps.py
// require_admin) and returns a real 403 regardless of what this component
// does, so there's no path to the actual student data without the real
// backend agreeing the signed-in account is the admin account.
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  if (!token) return <Navigate to="/login" replace />;

  if (user && user.role !== "admin") {
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-nexus-border bg-nexus-surface p-6 text-center space-y-2">
        <ShieldAlert size={28} className="mx-auto text-nexus-bad" />
        <h1 className="text-lg font-semibold">This area is restricted</h1>
        <p className="text-sm text-nexus-muted">
          /admin is for the platform's one Teacher/Admin account only. Your account doesn't have
          admin access.
        </p>
      </div>
    );
  }

  // user === null briefly while /auth/me is still loading after a refresh —
  // render children once it resolves rather than flashing the "restricted"
  // message for every student on every page load.
  return <>{children}</>;
}
