import { Navigate, Route, Routes } from "react-router-dom";

import ApiDiagnosticsPanel from "./components/ApiDiagnosticsPanel";
import AuthBootstrap from "./components/AuthBootstrap";
import PreferencesEffects from "./components/PreferencesEffects";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import RequireAdmin from "./components/RequireAdmin";
import StudentLayout from "./components/StudentLayout";
import TeacherLayout from "./components/teacher/TeacherLayout";
import AttentionLab from "./pages/AttentionLab";
import BehindNexus from "./pages/BehindNexus";
import CnnLab from "./pages/CnnLab";
import ConceptDna from "./pages/ConceptDna";
import PlannerDashboard from "./pages/planner/PlannerDashboard";
import PlannerMonth from "./pages/planner/PlannerMonth";
import PlannerWeek from "./pages/planner/PlannerWeek";
import DiscourseLab from "./pages/DiscourseLab";
import DlApplications from "./pages/DlApplications";
import DlFoundations from "./pages/DlFoundations";
import DlModule1 from "./pages/DlModule1";
import DlModule2 from "./pages/DlModule2";
import DlModule3 from "./pages/DlModule3";
import ForgotPassword from "./pages/ForgotPassword";
import Foundations from "./pages/Foundations";
import Home from "./pages/Home";
import LanguageModelingLab from "./pages/LanguageModelingLab";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ModelComparison from "./pages/ModelComparison";
import NerLab from "./pages/NerLab";
import NeuralNetworkPlayground from "./pages/NeuralNetworkPlayground";
import NlpLearningHub from "./pages/NlpLearningHub";
import NlpPlayground from "./pages/NlpPlayground";
import DigitalLibrary from "./pages/resources/DigitalLibrary";
import DlBook from "./pages/resources/DlBook";
import NlpBook from "./pages/resources/NlpBook";
import ParsingLab from "./pages/ParsingLab";
import PosTaggingLab from "./pages/PosTaggingLab";
import PreprocessingLab from "./pages/PreprocessingLab";
import Profile from "./pages/Profile";
import Progress from "./pages/Progress";
import RealWorldNlp from "./pages/RealWorldNlp";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import RnnLstmLab from "./pages/RnnLstmLab";
import Settings from "./pages/Settings";
import SemanticLab from "./pages/SemanticLab";
import VerifyEmail from "./pages/VerifyEmail";
import PhasePlaceholder from "./pages/PhasePlaceholder";
import { NAV_ITEMS } from "./utils/navigation";

// Community / Chat milestone — subject-focused discussions (public to the
// learning community) and private 1:1 messaging (participants only). Two
// separate route trees reflecting two separate privacy models; see
// backend/app/models/orm_models.py's module docstring.
import CommunityHome from "./pages/community/CommunityHome";
import DiscussionDetail from "./pages/community/DiscussionDetail";
import Messages from "./pages/community/Messages";
import NotificationsPage from "./pages/community/NotificationsPage";

// Teacher Dashboard build: /admin used to render inside the exact same
// Sidebar/TopBar as every student page. The expanded Teacher Portal (10+
// pages: students list, student profile, NLP/DL analytics, assessments,
// needs attention, activity, heatmap, reports, teacher profile/settings)
// needed its own nav that deliberately excludes the student lab pages —
// so /admin/* now mounts a completely separate TeacherLayout via nested
// routes, while every existing student route keeps rendering through the
// unchanged StudentLayout (previously inlined directly in this file).
// PreferencesEffects (accessibility data-attributes on <html>) stays
// mounted once at the top, outside both layouts, since it's app-wide and
// applies to the teacher portal too.
import AdminDashboard from "./pages/teacher/TeacherDashboard";
import StudentsList from "./pages/teacher/StudentsList";
import StudentProfile from "./pages/teacher/StudentProfile";
import DomainAnalytics from "./pages/teacher/DomainAnalytics";
import Assessments from "./pages/teacher/Assessments";
import NeedsAttention from "./pages/teacher/NeedsAttention";
import ActivityFeed from "./pages/teacher/ActivityFeed";
import ClassHeatmap from "./pages/teacher/ClassHeatmap";
import Reports from "./pages/teacher/Reports";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherSettings from "./pages/teacher/TeacherSettings";

// Super Admin Portal milestone. The one centrally-managing role above
// Student and Teacher — its own completely separate layout/nav
// (SuperAdminLayout, fixed dark-navy, never the reactive nexus.* theme),
// gated by RequireSuperAdmin exactly the way /admin is gated by
// RequireAdmin (client-side convenience only — every /api/superadmin/*
// call is independently re-checked server-side by require_super_admin).
import RequireSuperAdmin from "./components/superadmin/RequireSuperAdmin";
import SuperAdminLayout from "./components/superadmin/SuperAdminLayout";
import SuperAdminOverview from "./pages/superadmin/Overview";
import SuperAdminStudentsList from "./pages/superadmin/StudentsList";
import SuperAdminStudentDetail from "./pages/superadmin/StudentDetail";
import SuperAdminTeachersList from "./pages/superadmin/TeachersList";
import SuperAdminTeacherDetail from "./pages/superadmin/TeacherDetail";
import SuperAdminLearningActivity from "./pages/superadmin/LearningActivity";
import SuperAdminModeration from "./pages/superadmin/Moderation";
import SuperAdminSecurity from "./pages/superadmin/Security";
import SuperAdminAuditLog from "./pages/superadmin/AuditLog";
import SuperAdminSettings from "./pages/superadmin/Settings";

export default function App() {
  return (
    <>
      <PreferencesEffects />
      {/* Boot-time session verification (see AuthBootstrap.tsx/authStore's
          initAuth) — mounted once, app-wide, outside every layout so it
          runs regardless of which route a fresh tab lands on. */}
      <AuthBootstrap />
      {/* Dev-only diagnostics, now gated by BOTH import.meta.env.DEV and an
          explicit opt-in flag (VITE_SHOW_API_DIAGNOSTICS=true in .env —
          see .env.example), default off, so it never appears to a student
          even in a dev build run without that flag set. Mounted app-wide
          (not just inside the authenticated shell) since the panel's
          original purpose was diagnosing backend-connectivity failures on
          Sign Up/Sign In — pages that now live outside StudentLayout. */}
      <ApiDiagnosticsPanel />
      <Routes>
        {/* Public routes: no sidebar, no top bar, no NLP/DL nav, no
            progress/profile controls — see PublicLayout.tsx. A guest only
            ever sees one of these. */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          {/* AI Playground and Documentation were removed as features
              (2026-10-06) -- a manually-typed old URL redirects to
              Dashboard instead of 404ing, per the removal spec. /about is
              still a public route (reachable signed out), so a guest
              lands on the protected /dashboard route and is bounced to
              /login same as any other protected page they try directly --
              not a broken page, and no second routing system. */}
          <Route path="/about" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Protected routes: gated by ProtectedRoute BEFORE StudentLayout
            ever mounts (see ProtectedRoute.tsx) — the same
            wrap-the-layout pattern /admin and /super-admin already used
            below. A guest hitting any of these URLs directly is redirected
            to /login and never sees the sidebar, not even for a frame. */}
        <Route element={<ProtectedRoute />}>
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Study Planner (2026-10-07) -- task/habit planner, kept at
                its own /planner route tree rather than replacing
                /dashboard (reverted 2026-10-07 per user request: the
                original Dashboard stays at /dashboard, unchanged). */}
            <Route path="/planner" element={<PlannerDashboard />} />
            <Route path="/planner/week" element={<PlannerWeek />} />
            <Route path="/planner/month" element={<PlannerMonth />} />
            <Route path="/concept-dna" element={<ConceptDna />} />
            <Route path="/foundations" element={<Foundations />} />
            <Route path="/preprocessing" element={<PreprocessingLab />} />
            <Route path="/progress" element={<Progress />} />
            {/* Combined Digital Library shelf (user request,
                2026-10-07) -- replaces the sidebar's old separate
                "NLP Digital Book"/"Deep Learning Digital Book"
                entries with one shelf holding both books. The two
                routes below still exist and still serve the
                ?chapter= deep-link contract unchanged -- see
                NlpBook.tsx/DlBook.tsx. */}
            <Route path="/resources/library" element={<DigitalLibrary />} />
            <Route path="/resources/nlp-book" element={<NlpBook />} />
            <Route path="/resources/dl-book" element={<DlBook />} />
            <Route path="/profile" element={<Profile />} />
            {/* "Behind the Nexus" (2026-10-08 user spec) -- the platform's
                final, emotional/human chapter. Deliberately NOT a NAV_ITEMS
                entry (spec section 21: no new sidebar item) -- reached via a
                subtle link on the Profile page instead, see Profile.tsx. */}
            <Route path="/behind-the-nexus" element={<BehindNexus />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/nlp-learning-hub" element={<NlpLearningHub />} />
            <Route path="/pos-tagging" element={<PosTaggingLab />} />
            <Route path="/language-modeling" element={<LanguageModelingLab />} />
            <Route path="/parsing" element={<ParsingLab />} />
            <Route path="/semantics" element={<SemanticLab />} />
            <Route path="/discourse" element={<DiscourseLab />} />
            <Route path="/dl-foundations" element={<DlFoundations />} />
            <Route path="/dl-module-1" element={<DlModule1 />} />
            <Route path="/dl-module-2" element={<DlModule2 />} />
            <Route path="/dl-module-3" element={<DlModule3 />} />
            <Route path="/neural-networks" element={<NeuralNetworkPlayground />} />
            <Route path="/cnn-lab" element={<CnnLab />} />
            <Route path="/rnn-lstm-lab" element={<RnnLstmLab />} />
            <Route path="/attention-transformers" element={<AttentionLab />} />
            <Route path="/playground" element={<NlpPlayground />} />
            <Route path="/applications" element={<RealWorldNlp />} />
            <Route path="/ner-lab" element={<NerLab />} />
            <Route path="/dl-applications" element={<DlApplications />} />
            <Route path="/model-comparison" element={<ModelComparison />} />
            <Route path="/dl-challenges" element={<Navigate to="/dashboard" replace />} />
            <Route path="/challenges" element={<Navigate to="/dashboard" replace />} />
            <Route path="/ai-playground" element={<Navigate to="/dashboard" replace />} />
            <Route path="/community" element={<CommunityHome />} />
            <Route path="/community/:discussionId" element={<DiscussionDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            {NAV_ITEMS.filter((item) => item.status === "phase-planned").map((item) => (
              <Route key={item.path} path={item.path} element={<PhasePlaceholder label={item.label} />} />
            ))}
          </Route>
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <TeacherLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<StudentsList />} />
          <Route path="students/:studentId" element={<StudentProfile />} />
          <Route path="analytics/nlp" element={<DomainAnalytics domain="nlp" />} />
          <Route path="analytics/dl" element={<DomainAnalytics domain="dl" />} />
          <Route path="assessments" element={<Assessments />} />
          <Route path="attention" element={<NeedsAttention />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="heatmap" element={<ClassHeatmap />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="settings" element={<TeacherSettings />} />
        </Route>

        <Route
          path="/super-admin"
          element={
            <RequireSuperAdmin>
              <SuperAdminLayout />
            </RequireSuperAdmin>
          }
        >
          <Route index element={<SuperAdminOverview />} />
          <Route path="students" element={<SuperAdminStudentsList />} />
          <Route path="students/:studentId" element={<SuperAdminStudentDetail />} />
          <Route path="teachers" element={<SuperAdminTeachersList />} />
          <Route path="teachers/:teacherId" element={<SuperAdminTeacherDetail />} />
          <Route path="learning-activity" element={<SuperAdminLearningActivity />} />
          <Route path="moderation" element={<SuperAdminModeration />} />
          <Route path="security" element={<SuperAdminSecurity />} />
          <Route path="audit-log" element={<SuperAdminAuditLog />} />
          <Route path="settings" element={<SuperAdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}
