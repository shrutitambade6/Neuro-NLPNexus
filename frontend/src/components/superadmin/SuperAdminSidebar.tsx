import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  FileClock,
  Gavel,
  LayoutDashboard,
  Lock,
  Settings,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useUiStore } from "../../store/uiStore";

// Super Admin Portal's own nav — deliberately a different list from both
// NAV_ITEMS (student) and TEACHER_NAV_SECTIONS (teacher): per the spec,
// this role manages the whole platform (accounts, security, moderation,
// audit) and never touches the student curriculum or a single class's
// day-to-day teaching view. Fixed dark-navy styling throughout this
// portal (slate/indigo, not the nexus.* theme tokens) is deliberate —
// visually related to NeuroNLP Nexus (same font, same brand name) but
// clearly distinct from the student/teacher surfaces, matching the "dark
// navy / security-oriented visual language" the spec asked for.
interface SaNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const SA_NAV: SaNavItem[] = [
  { label: "Overview", path: "/super-admin", icon: LayoutDashboard },
  { label: "Students", path: "/super-admin/students", icon: Users },
  { label: "Teachers", path: "/super-admin/teachers", icon: UserCog },
  { label: "Learning Activity", path: "/super-admin/learning-activity", icon: BarChart3 },
  { label: "Community Moderation", path: "/super-admin/moderation", icon: Gavel },
  { label: "Security", path: "/super-admin/security", icon: ShieldAlert },
  { label: "Audit Log", path: "/super-admin/audit-log", icon: FileClock },
  { label: "Settings", path: "/super-admin/settings", icon: Settings },
];

function NavRows({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      {SA_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/super-admin"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm border-l-2 transition-colors ${
              isActive
                ? "border-indigo-400 bg-indigo-500/10 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
            }`
          }
        >
          <item.icon size={16} className={undefined} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function PrivacyIndicator() {
  return (
    <div className="px-4 py-3 border-t border-slate-800 flex items-start gap-2">
      <Lock size={13} className="text-emerald-400 mt-0.5 shrink-0" />
      <p className="text-[10.5px] leading-snug text-slate-500">
        Confidential data (passwords, tokens) is never exposed here. Every sensitive action you
        take is written to the immutable Audit Log.
      </p>
    </div>
  );
}

export default function SuperAdminSidebar() {
  const drawerOpen = useUiStore((s) => s.teacherDrawerOpen);
  const closeDrawer = useUiStore((s) => s.closeTeacherDrawer);

  return (
    <>
      {/* Desktop: docked. Reuses the same teacherDrawerOpen/closeTeacherDrawer
          UI-store slice the Teacher Portal uses for its own mobile drawer —
          this portal is never open at the same time as that one (different
          routes entirely), so sharing the boolean is safe and avoids adding
          a third near-identical piece of UI state. */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
          <Lock className="text-indigo-400" size={20} />
          <div>
            <p className="font-display font-semibold text-sm leading-tight text-slate-100">
              NeuroNLP Nexus
            </p>
            <p className="text-[11px] text-slate-500 leading-tight">Super Admin Portal</p>
          </div>
        </div>
        <NavRows />
        <PrivacyIndicator />
      </aside>

      {/* Mobile: overlay drawer. */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800 bg-slate-950 shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Super Admin navigation"
          >
            <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="text-indigo-400" size={20} />
                <div>
                  <p className="font-display font-semibold text-sm leading-tight text-slate-100">
                    NeuroNLP Nexus
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">Super Admin Portal</p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-slate-500 hover:text-slate-200 rounded-lg p-1.5 hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <NavRows onNavigate={closeDrawer} />
            <PrivacyIndicator />
          </aside>
        </>
      )}
    </>
  );
}
