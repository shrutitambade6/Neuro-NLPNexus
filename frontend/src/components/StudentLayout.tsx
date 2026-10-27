import { Outlet } from "react-router-dom";

import BirthdayCelebrationLayer from "./birthday/BirthdayCelebrationLayer";
import BirthdayGreeting from "./birthday/BirthdayGreeting";
import BirthdayWishesPanel from "./birthday/BirthdayWishesPanel";
import CommandPalette from "./CommandPalette";
import NeuralBackground from "./NeuralBackground";
import Sidebar from "./Sidebar";
import StoryProgressIndicator from "./story/StoryProgressIndicator";
import TopBar from "./TopBar";
import { useBirthday } from "../hooks/useBirthday";

// Teacher Dashboard build: App.tsx used to render this chrome (background,
// command palette, sidebar, top bar) directly around a single <Routes>
// block that mixed student pages and /admin together. The teacher portal
// now needs its own, deliberately different shell (see
// components/teacher/TeacherLayout.tsx — no student nav, no command
// palette searching student pages, fewer animations), so this component
// is exactly that old wrapper lifted out unchanged and turned into a
// layout route element. Every student page renders identically to before;
// nothing here was removed or restyled.
//
// "Remove API Diagnostics from the UI" pass: <ApiDiagnosticsPanel /> used
// to be mounted here, visible to every student on every page (it was only
// ever DEV-build-gated, not route/role-gated, and not opt-in). It's now
// mounted once in App.tsx instead — app-wide rather than only inside this
// authenticated shell, since its original purpose (debugging a real
// "can't reach the backend" failure) matters just as much on the public
// Sign In/Sign Up pages, which no longer render through this layout — and
// double-gated there on both import.meta.env.DEV and an explicit
// VITE_SHOW_API_DIAGNOSTICS opt-in flag (default off; see
// ApiDiagnosticsPanel.tsx and .env.example). Not hidden with
// opacity/off-screen positioning in either case — genuinely absent from
// the render tree unless a developer opts in.
//
// "Remove the Progress button from the UI" pass: <ProgressModal /> used
// to be mounted here unconditionally, backing the header's "Progress"
// button in TopBar.tsx. That button (and its Dashboard counterpart) has
// been removed, so nothing opens this modal anymore — removed here too,
// along with the component file itself, rather than left mounted with no
// trigger. The real progress data it displayed (ProgressSummaryPanel) is
// untouched and still renders on the Profile page and the dedicated
// /progress page.
export default function StudentLayout() {
  // Birthday Experience milestone — mounted once here so the ambient
  // celebration layer, the one-time greeting overlay, and the wishes
  // panel are all available no matter which protected page a student on
  // their birthday happens to land on first, rather than duplicated per
  // page. All three render nothing at all (not even hidden markup) once
  // isBirthdayToday is false or the relevant dismiss flag is set — see
  // hooks/useBirthday.ts / store/birthdayStore.ts.
  const { isBirthdayToday } = useBirthday();

  return (
    <div className="relative flex min-h-screen bg-nexus-bg text-nexus-text font-sans">
      <NeuralBackground />
      {isBirthdayToday && <BirthdayCelebrationLayer />}
      <BirthdayGreeting />
      <BirthdayWishesPanel />
      <CommandPalette />
      <Sidebar />
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <TopBar />
        {/* Storytelling-UI pass (2026-10-07, section 16): a subtle, quiet
            strip -- renders nothing at all on a page with no mapped story
            phase, see storyJourney.ts. */}
        <StoryProgressIndicator />
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
