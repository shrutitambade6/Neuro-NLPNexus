import { useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";

import ThemeToggle from "../../components/ThemeToggle";
import { ChangePasswordForm } from "../Settings";
import { useAuthStore } from "../../store/authStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useTeacherPreferencesStore } from "../../store/teacherPreferencesStore";

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-nexus-border bg-nexus-surface p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-xs text-nexus-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Reuses exactly the same real controls as the student Settings page
// (ThemeToggle, ChangePasswordForm, the accessibility toggles) rather than
// forking them — this account authenticates and changes its password
// through the identical /auth endpoints as every student account, just
// with role="admin". Only "Learning Preferences" (domain focus, tooltip
// trigger — student-only concepts) is dropped, and one teacher-specific
// toggle is added in its place.
export default function TeacherSettings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion);
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion);
  const largeText = usePreferencesStore((s) => s.largeText);
  const setLargeText = usePreferencesStore((s) => s.setLargeText);
  const showAttentionBadge = useTeacherPreferencesStore((s) => s.showAttentionBadge);
  const setShowAttentionBadge = useTeacherPreferencesStore((s) => s.setShowAttentionBadge);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-nexus-muted text-sm mt-1">Appearance, account security, notifications, and accessibility.</p>
      </div>

      <SectionCard title="Appearance" description="Switch instantly — no reload. System follows your OS and keeps following it live.">
        <ThemeToggle />
      </SectionCard>

      <SectionCard title="Account & Security">
        {user ? (
          <div className="space-y-5">
            {/* College Email milestone (2026-10-08) -- same reference-display
                change as pages/Settings.tsx: show every detail collected at
                signup (account type, full name, college email, username)
                so the teacher can confirm what they signed up with.
                Password is deliberately never shown back. */}
            <div className="grid grid-cols-2 gap-4 text-sm max-w-sm">
              <div>
                <p className="text-xs text-nexus-muted">Account Type</p>
                <p className="mt-0.5">{user.role === "super_admin" ? "Super Admin" : "Teacher"}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Username</p>
                <p className="mt-0.5">{user.username}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">Full Name</p>
                <p className="mt-0.5 truncate">{user.full_name ?? user.username}</p>
              </div>
              <div>
                <p className="text-xs text-nexus-muted">College Email</p>
                <p className="mt-0.5 truncate">{user.email ?? "Not on file"}</p>
              </div>
            </div>
            <ChangePasswordForm />
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-nexus-border px-3 py-1.5 text-sm text-nexus-muted hover:text-nexus-bad hover:border-nexus-bad/40 transition-colors"
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        ) : (
          <p className="text-sm text-nexus-muted">Not signed in.</p>
        )}
      </SectionCard>

      <SectionCard title="Notifications" description="There's no email/SMS digest system yet — this controls what the in-app dashboard surfaces instead.">
        <label className="flex items-center justify-between gap-4 max-w-sm cursor-pointer">
          <span className="flex items-center gap-2">
            <Bell size={14} className="text-nexus-muted shrink-0" />
            <span>
              <span className="text-sm">Show Needs Attention count in sidebar</span>
              <span className="block text-[11px] text-nexus-muted">A live badge next to "Needs Attention" when students are flagged.</span>
            </span>
          </span>
          <input
            type="checkbox"
            checked={showAttentionBadge}
            onChange={(e) => setShowAttentionBadge(e.target.checked)}
            className="h-4 w-4 accent-nexus-accent shrink-0"
          />
        </label>
      </SectionCard>

      <SectionCard title="Accessibility" description="Both apply immediately, app-wide, and are remembered on this device.">
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 max-w-sm cursor-pointer">
            <span>
              <span className="text-sm">Reduce motion</span>
              <span className="block text-[11px] text-nexus-muted">Cuts CSS transitions/animations to near-zero duration.</span>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="h-4 w-4 accent-nexus-accent shrink-0"
            />
          </label>
          <label className="flex items-center justify-between gap-4 max-w-sm cursor-pointer">
            <span>
              <span className="text-sm">Larger text</span>
              <span className="block text-[11px] text-nexus-muted">Scales body text and headings up app-wide.</span>
            </span>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className="h-4 w-4 accent-nexus-accent shrink-0"
            />
          </label>
        </div>
      </SectionCard>
    </div>
  );
}
