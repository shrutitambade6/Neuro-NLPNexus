import { Outlet } from "react-router-dom";

import SuperAdminSidebar from "./SuperAdminSidebar";
import SuperAdminTopBar from "./SuperAdminTopBar";

// The Super Admin Portal's own shell. Fixed dark-navy (bg-slate-950),
// never theme-reactive — this is a deliberately distinct "security
// console" surface, not a dark-mode variant of the student/teacher
// theme. No NeuralBackground, no command palette, no framer-motion
// springs: restrained by design, same reasoning TeacherLayout.tsx gives
// for the Teacher Portal, taken one step further here since this role
// touches account status, password resets, and private message content.
export default function SuperAdminLayout() {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      <SuperAdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <SuperAdminTopBar />
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
