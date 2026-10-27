import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";

// Deliberately minimal and distinct from TopBar.tsx/TeacherTopBar.tsx — no
// theme toggle, no command palette, no notification bell: this portal has
// no student-style chrome at all. Just enough to confirm whose session
// this is and get back out.
export default function SuperAdminTopBar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleDrawer = useUiStore((s) => s.toggleTeacherDrawer);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 md:px-6 py-3">
      <button
        onClick={toggleDrawer}
        className="md:hidden text-slate-400 hover:text-slate-100 rounded-lg p-1.5 hover:bg-slate-800 transition-colors"
      >
        <Menu size={18} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <ShieldCheck size={14} className="text-indigo-400" />
        <span className="hidden sm:inline">{user?.username ?? "Super Admin"}</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 rounded-lg px-2.5 py-1.5 border border-slate-800 hover:border-rose-400/40 transition-colors"
      >
        <LogOut size={13} />
        Sign out
      </button>
    </header>
  );
}
