import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Brain,
  Cpu,
  Dna,
  FileText,
  Film,
  GitBranch,
  GraduationCap,
  Home,
  LayoutDashboard,
  Library,
  Mail,
  MessagesSquare,
  Layers,
  Network,
  Puzzle,
  RotateCw,
  Scale,
  Settings as SettingsIcon,
  Sparkles,
  SplitSquareHorizontal,
  Tags,
  Type,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  status: "ready" | "phase-planned"; // honest about what's implemented vs. scaffolded
  // Sidebar grouping. "command" items render ungrouped at the top;
  // everything else renders under its section's header. Home ("/") is
  // deliberately left out of the rendered sidebar rows — it's reachable via
  // the sidebar's brand/logo link instead — but its route and this entry
  // both still exist, nothing about it was removed.
  //
  // "nlp" and "dl" replace the old "learn"/"labs" split: the platform now
  // has two parallel domains (NLP and Deep Learning), each holding both its
  // foundational theory pages and its hands-on labs together, matching the
  // sidebar structure the NeuroNLP Nexus spec asked for. "practice" and
  // "resources" stay domain-agnostic sections that can hold items from
  // either domain. (The "applications" section was removed 2026-10-06 --
  // Real-World NLP and Deep Learning Applications are still real pages,
  // linked from NLP Learning Hub and Concept DNA, just no longer surfaced
  // as their own sidebar section.)
  section: "command" | "nlp" | "dl" | "community" | "practice" | "resources" | "account";
  // Which domain this item belongs to, for the domain switcher and any
  // future domain-filtered views (Dashboard). "shared" is for items that
  // aren't really NLP- or DL-specific (Home, Dashboard, User Progress).
  domain: "nlp" | "dl" | "shared";
}

// Note: this list used to carry a "phase" number per item, shown in the UI
// as a "Phase N" badge on anything not built yet. That was development
// bookkeeping leaking into the student-facing product. Status is now
// communicated only as ready vs. not-yet-built (see Sidebar/CommandPalette/
// LabCard), with no reference to build phases anywhere users see it.
//
// Deep Learning entries below are new as of the NeuroNLP Nexus expansion.
// Every one of them is honestly marked "phase-planned" — the real DL labs
// haven't been built yet (that's Stage 3 onward). Adding the nav entry now,
// pointed at the existing PhasePlaceholder route, is what the project's own
// "don't expose fake finished features, but don't hide the plan either"
// rule calls for: the entry is visible and honest, not a live page dressed
// up as working.
export const NAV_ITEMS: NavItem[] = [
  { label: "Home", path: "/", icon: Home, status: "ready", section: "command", domain: "shared" },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, status: "ready", section: "command", domain: "shared" },
  // Concept DNA milestone — a cross-domain concept knowledge graph, not
  // specific to either the NLP or DL label the way the sections below
  // are, so it sits in "command" (ungrouped, top-of-sidebar) right next
  // to Dashboard, matching the spec's own requested placement.
  { label: "Concept DNA", path: "/concept-dna", icon: Dna, status: "ready", section: "command", domain: "shared" },

  // NLP — foundations + labs together
  { label: "NLP Foundations", path: "/foundations", icon: BookOpen, status: "ready", section: "nlp", domain: "nlp" },
  { label: "NLP Learning Hub", path: "/nlp-learning-hub", icon: GraduationCap, status: "ready", section: "nlp", domain: "nlp" },
  { label: "Text Processing", path: "/preprocessing", icon: Type, status: "ready", section: "nlp", domain: "nlp" },
  { label: "POS Tagging Lab", path: "/pos-tagging", icon: Tags, status: "ready", section: "nlp", domain: "nlp" },
  { label: "Language Modeling", path: "/language-modeling", icon: FileText, status: "ready", section: "nlp", domain: "nlp" },
  { label: "Parsing Lab", path: "/parsing", icon: GitBranch, status: "ready", section: "nlp", domain: "nlp" },
  { label: "Semantic Lab", path: "/semantics", icon: Sparkles, status: "ready", section: "nlp", domain: "nlp" },
  { label: "Discourse Lab", path: "/discourse", icon: MessagesSquare, status: "ready", section: "nlp", domain: "nlp" },

  // Deep Learning — foundations + labs together (built incrementally, stage by
  // stage; each one's status flips from "phase-planned" to "ready" the day
  // its real lab ships — DL Foundations was the first, see below)
  { label: "DL Foundations", path: "/dl-foundations", icon: Cpu, status: "ready", section: "dl", domain: "dl" },
  // Module 1/2/3 rebuild the DL curriculum directly from the user's own
  // uploaded course PDFs (chap_01.docx, Neural_network_chap-2.docx,
  // Autoencoders_1.docx, Brief_History1.1.docx) — see each page for exact
  // source attribution per section.
  { label: "Module 1 — Foundations", path: "/dl-module-1", icon: Cpu, status: "ready", section: "dl", domain: "dl" },
  { label: "Module 2 — Backpropagation", path: "/dl-module-2", icon: Network, status: "ready", section: "dl", domain: "dl" },
  { label: "Module 3 — Autoencoders", path: "/dl-module-3", icon: Layers, status: "ready", section: "dl", domain: "dl" },
  { label: "Neural Networks", path: "/neural-networks", icon: Network, status: "ready", section: "dl", domain: "dl" },
  { label: "CNN Lab", path: "/cnn-lab", icon: Layers, status: "ready", section: "dl", domain: "dl" },
  { label: "RNN & LSTM Lab", path: "/rnn-lstm-lab", icon: RotateCw, status: "ready", section: "dl", domain: "dl" },
  { label: "Attention & Transformers", path: "/attention-transformers", icon: Sparkles, status: "ready", section: "dl", domain: "dl" },
  // No separate "Deep Learning Playground" nav entry — /dl-playground
  // never shipped as a page, so nothing is being removed here, just not
  // built as planned (see NLP Playground below for the one playground
  // this platform does have).

  // Community / Chat milestone — subject-focused discussions (separate
  // from private 1:1 messaging; see orm_models.py's module docstring for
  // why those are two different systems). Notifications gets its own nav
  // entry too, matching the proposed nav structure, even though the bell
  // icon in TopBar is the faster way to reach it day to day.
  { label: "Discussions", path: "/community", icon: Users, status: "ready", section: "community", domain: "shared" },
  { label: "Messages", path: "/messages", icon: Mail, status: "ready", section: "community", domain: "shared" },
  { label: "Notifications", path: "/notifications", icon: Bell, status: "ready", section: "community", domain: "shared" },

  // Practice (NLP Challenges and Deep Learning Challenges removed 2026-10-06
  // -- neither shipped as a feature worth keeping; see
  // claude/sidebar-collapsible-redesign.md for the removal notes)
  { label: "Model Comparison", path: "/model-comparison", icon: Scale, status: "ready", section: "practice", domain: "shared" },
  { label: "NLP Playground", path: "/playground", icon: Puzzle, status: "ready", section: "practice", domain: "nlp" },
  // "Inside the NER Lab" -- a video-led showcase of the NER workflow plus
  // the real NER tool embedded inline (see pages/NerLab.tsx). Lives in
  // "practice" alongside Model Comparison/NLP Playground rather than
  // reintroducing the removed "applications" section.
  { label: "NER Lab", path: "/ner-lab", icon: Film, status: "ready", section: "practice", domain: "nlp" },

  // Resources — the two Interactive Learning Books (point 21 of the
  // Theory -> Books migration: they're the platform's theory hub now
  // that lab pages are theory-trimmed) used to be two separate named
  // nav entries here. User request, 2026-10-07: "we have created 2
  // sections of nlp and dl book separately so i want a library where
  // the shelf will be having the same ui ... just books will be add
  // on both book on 1 shelf" -- confirmed via AskUserQuestion to
  // REPLACE both entries with one "Digital Library" entry
  // (/resources/library) whose shelf holds both books side by side
  // (components/library/CombinedBookshelf.tsx). The old per-book
  // routes (/resources/nlp-book, /resources/dl-book) still exist and
  // are unchanged -- they still serve the ?chapter= "Read this
  // concept" deep-link contract from lab pages elsewhere; only their
  // own standalone single-book shelf view (no ?chapter=) now redirects
  // to /resources/library instead, so there is only one "browse the
  // library" experience (see NlpBook.tsx/DlBook.tsx). User Progress is
  // unchanged.
  { label: "Digital Library", path: "/resources/library", icon: Library, status: "ready", section: "resources", domain: "shared" },
  { label: "User Progress", path: "/progress", icon: SplitSquareHorizontal, status: "ready", section: "resources", domain: "shared" },

  // Account — Profile and Settings are real, already-built pages
  // (pages/Profile.tsx, pages/Settings.tsx, routed in App.tsx); until now
  // they were reachable only via the TopBar username dropdown (UserMenu).
  // The sidebar compaction redesign asked for them at the bottom of the
  // drawer too, which this adds — nothing new was built, just a second,
  // more discoverable entry point to pages that already existed. The
  // UserMenu dropdown links are left exactly as they were.
  { label: "Profile", path: "/profile", icon: UserCircle, status: "ready", section: "account", domain: "shared" },
  { label: "Settings", path: "/settings", icon: SettingsIcon, status: "ready", section: "account", domain: "shared" },
];

// Sidebar grouping metadata for the "nlp" and "dl" sections only (Sidebar
// Redesign — collapsible accordion). This does NOT replace NAV_ITEMS as
// the source of truth: CommandPalette and any flat consumer still reads
// NAV_ITEMS directly, unchanged. These two arrays just tell the Sidebar
// how to cluster the SAME items (by path, looked up against NAV_ITEMS for
// label/icon/status) into short, named categories instead of one long
// flat list — no item here is invented, removed, or duplicated across
// categories; every path below already exists above exactly once.
export interface NavGroup {
  category: string;
  paths: string[];
}

export const NLP_GROUPS: NavGroup[] = [
  { category: "Foundations", paths: ["/foundations", "/nlp-learning-hub"] },
  { category: "Text & Language", paths: ["/preprocessing", "/language-modeling"] },
  { category: "Syntax", paths: ["/pos-tagging", "/parsing"] },
  { category: "Semantics & Discourse", paths: ["/semantics", "/discourse"] },
];

export const DL_GROUPS: NavGroup[] = [
  { category: "Foundations & Training", paths: ["/dl-foundations", "/dl-module-1", "/dl-module-2", "/neural-networks"] },
  { category: "Architectures", paths: ["/dl-module-3", "/cnn-lab", "/rnn-lstm-lab", "/attention-transformers"] },
];

export const NAV_SECTIONS: { id: NavItem["section"]; label: string | null }[] = [
  { id: "command", label: null },
  // Sidebar.tsx renders "nlp"/"dl" itself as a collapsible accordion pair
  // under one shared "LEARNING" header (see DOMAIN_META + NLP_GROUPS/
  // DL_GROUPS above) rather than reading these two labels — kept here,
  // descriptive but unused by that code path, so this table stays a
  // complete, self-documenting map of every section regardless.
  { id: "nlp", label: "Learning — NLP" },
  { id: "dl", label: "Learning — Deep Learning" },
  { id: "community", label: "Community" },
  { id: "practice", label: "Practice" },
  { id: "resources", label: "Resources" },
  { id: "account", label: "Account" },
];

// Per-domain header copy for the collapsible NLP/Deep Learning groups —
// kept beside NLP_GROUPS/DL_GROUPS rather than hardcoded in Sidebar.tsx so
// both stay in one place.
export const DOMAIN_META = {
  nlp: { label: "NLP", tagline: "Natural Language Processing", icon: Brain, accent: "purple" as const },
  dl: { label: "Deep Learning", tagline: "Neural Networks & Models", icon: Zap, accent: "gold" as const },
};
