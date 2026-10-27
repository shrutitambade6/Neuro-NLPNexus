import { Outlet } from "react-router-dom";

import TeacherSidebar from "./TeacherSidebar";
import TeacherTopBar from "./TeacherTopBar";

// The Teacher Dashboard's own shell — intentionally plainer than
// StudentLayout.tsx: no animated neural background, no command palette.
// Spec point 10 asks for restrained animation here (loading/charts/hover/
// transitions only), and point 9 asks for a nav that doesn't surface the
// student lab pages at all — both are easiest to guarantee by giving the
// teacher portal its own layout rather than reusing the student one with
// conditions sprinkled through it.
export default function TeacherLayout() {
  return (
    <div className="relative flex min-h-screen bg-nexus-bg text-nexus-text font-sans">
      <TeacherSidebar />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <TeacherTopBar />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
