import { useEffect, useState } from "react";
import { Calendar, IdCard, ShieldCheck, User, Users } from "lucide-react";

import { fetchAdminOverview, type AdminOverview } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { formatDate } from "../../utils/formatDate";

// Mirrors pages/Profile.tsx's structure (account info card) but swaps the
// student's personal learning-progress panel for a one-line "my class"
// snapshot — a teacher's own real account, not a lesson checklist that
// doesn't apply to the admin account.
export default function TeacherProfile() {
  const user = useAuthStore((s) => s.user);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminOverview()
      .then((d) => active && setOverview(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Teacher Profile</h1>
        <p className="text-nexus-muted text-sm mt-1">Your account details.</p>
      </div>

      <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-nexus-accent/15 p-3 shrink-0">
            <User size={22} className="text-nexus-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold">{user.username}</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {/* Username/Password Authentication milestone (2026-10-07) -- same
                  swap as pages/Profile.tsx: Full Name instead of email. */}
              <div className="flex items-center gap-2 text-nexus-muted">
                <IdCard size={14} className="shrink-0" />
                <span className="truncate">{user.full_name ?? user.username}</span>
              </div>
              <div className="flex items-center gap-2 text-nexus-muted">
                <Calendar size={14} className="shrink-0" />
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-nexus-muted">
                <ShieldCheck size={14} className="shrink-0" />
                <span>Teacher / admin account</span>
              </div>
              {overview && (
                <div className="flex items-center gap-2 text-nexus-muted">
                  <Users size={14} className="shrink-0" />
                  <span>{overview.total_students} student{overview.total_students === 1 ? "" : "s"} enrolled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
