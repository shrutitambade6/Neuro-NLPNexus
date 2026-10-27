import { ShieldCheck } from "lucide-react";

// A small, deliberately understated badge — "distinguish Teacher
// responses... using a small Teacher badge rather than visually
// overpowering the conversation." Same accent color as the admin link in
// Sidebar.tsx, nothing louder.
export default function TeacherBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-nexus-accentDim/40 bg-nexus-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-nexus-accent">
      <ShieldCheck size={10} /> Teacher
    </span>
  );
}
