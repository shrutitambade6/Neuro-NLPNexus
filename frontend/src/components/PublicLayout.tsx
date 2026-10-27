import { Outlet } from "react-router-dom";

import NeuralBackground from "./NeuralBackground";

// Platform Hardening follow-up — "guest sees the authenticated sidebar"
// fix. Public routes (/, /about, /login, /register, /verify-email,
// /forgot-password, /reset-password) now render through THIS layout
// instead of StudentLayout. Before this fix, every route — public and
// protected alike — shared one <Route element={<StudentLayout />}> group,
// so the Sidebar (NLP/DL lab navigation), TopBar (progress button,
// notifications, profile menu) and the rest of the authenticated app
// chrome always mounted, even for a signed-out visitor on the public
// landing page.
//
// Deliberately mirrors StudentLayout's own outer shell (same background,
// same <main> padding/max-width) so Home/About/Login/Register — none of
// which carry their own page gutter — look exactly as they did before:
// this only removes the sidebar/top bar/command palette/progress-modal
// chrome that assumes a signed-in student, nothing about spacing or
// design.
export default function PublicLayout() {
  return (
    <div className="relative flex min-h-screen bg-nexus-bg text-nexus-text font-sans">
      <NeuralBackground />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
