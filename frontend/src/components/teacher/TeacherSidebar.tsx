import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  ClipboardCheck,
  FileDown,
  Grid3x3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import { fetchNeedsAttention } from "../../services/api";
import { useTeacherPreferencesStore } from "../../store/teacherPreferencesStore";
import { useUiStore } from "../../store/uiStore";

// Teacher Dashboard spec, point 9 of the "document" narrative: a
// teacher-only nav that deliberately does NOT include the student lab
// pages (NLP Foundations, POS Tagging Lab, CNN Lab, etc). The teacher is
// here to monitor and support, not to re-navigate the student curriculum —
// so this list has nothing in common with utils/navigation.ts's NAV_ITEMS
// on purpose, not by omission.
interface TeacherNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface TeacherNavSection {
  label: string | null;
  items: TeacherNavItem[];
}

const TEACHER_NAV_SECTIONS: TeacherNavSection[] = [
  { label: null, items: [{ label: "Dashboard", path: "/admin", icon: LayoutDashboard }] },
  {
    label: "Students",
    items: [
      { label: "All Students", path: "/admin/students", icon: Users },
      { label: "Needs Attention", path: "/admin/attention", icon: AlertTriangle },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "NLP Analytics", path: "/admin/analytics/nlp", icon: BarChart3 },
      { label: "DL Analytics", path: "/admin/analytics/dl", icon: BarChart3 },
      { label: "Class Heatmap", path: "/admin/heatmap", icon: Grid3x3 },
    ],
  },
  {
    label: "Assessment",
    items: [
      { label: "Assessments", path: "/admin/assessments", icon: ClipboardCheck },
      { label: "Recent Activity", path: "/admin/activity", icon: Award },
      { label: "Reports", path: "/admin/reports", icon: FileDown },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Teacher Profile", path: "/admin/profile", icon: UserIcon },
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const showAttentionBadge = useTeacherPreferencesStore((s) => s.showAttentionBadge);
  const [attentionCount, setAttentionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showAttentionBadge) return;
    let active = true;
    fetchNeedsAttention()
      .then((d) => active && setAttentionCount(d.students.length))
      .catch(() => active && setAttentionCount(null));
    return () => {
      active = false;
    };
  }, [showAttentionBadge]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-5 py-5 border-b border-nexus-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-nexus-accent" size={22} />
          <div>
            <p className="font-display font-semibold text-sm leading-tight">NeuroNLP Nexus</p>
            <p className="text-[11px] text-nexus-muted leading-tight">Teacher Dashboard</p>
          </div>
        </div>
        <button
          onClick={onNavigate}
          title="Close menu"
          className="md:hidden text-nexus-muted hover:text-nexus-text rounded-lg p-1.5 hover:bg-nexus-surfaceAlt transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {TEACHER_NAV_SECTIONS.map((section, i) => (
          <div key={section.label ?? `section-${i}`} className="mb-1">
            {section.label && (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-nexus-muted/70">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/admin"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg pl-3 pr-3 py-2 ml-0.5 text-sm border-l-2 transition-colors ${
                      isActive
                        ? "border-nexus-accent bg-nexus-accent/10 text-nexus-text"
                        : "border-transparent text-nexus-muted hover:text-nexus-text hover:bg-nexus-surfaceAlt"
                    }`
                  }
                >
                  <item.icon size={16} className="text-nexus-muted group-hover:text-nexus-accent shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.path === "/admin/attention" && showAttentionBadge && !!attentionCount && (
                    <span className="text-[10px] font-mono rounded-full bg-nexus-warn/15 text-nexus-warn px-1.5 py-0.5 shrink-0">
                      {attentionCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-nexus-border text-[11px] text-nexus-muted">
        Viewing real, persisted class data — not sampled or illustrative.
      </div>
    </>
  );
}

export default function TeacherSidebar() {
  const open = useUiStore((s) => s.teacherDrawerOpen);
  const close = useUiStore((s) => s.closeTeacherDrawer);

  return (
    <>
      {/* Docked on tablet/desktop — always visible, no animation needed. */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:shrink-0 border-r border-nexus-border bg-nexus-surface">
        <SidebarContents />
      </aside>

      {/* Mobile: a simple CSS-transition overlay drawer (no spring/physics —
          the teacher UI intentionally uses less motion than the student
          UI). */}
      <div
        className={`md:hidden fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
        aria-hidden="true"
      />
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-nexus-border bg-nexus-surface shadow-2xl transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Teacher navigation"
      >
        <SidebarContents onNavigate={close} />
      </aside>
    </>
  );
}
