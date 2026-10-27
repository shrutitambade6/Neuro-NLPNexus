import { BookMarked, Sparkles } from "lucide-react";

// Used across the Module 1/2/3 DL curriculum pages to honestly distinguish
// content extracted directly from the user's uploaded course PDFs from
// supplementary explanation added for clarity. Per the user's explicit
// instruction: "Clearly distinguish 'From Your PDF/Syllabus' content from
// optional supplementary explanations."
export function SyllabusBadge({ source }: { source?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-nexus-accent">
      <BookMarked size={11} />
      From your syllabus{source ? ` — ${source}` : ""}
    </span>
  );
}

export function SupplementaryBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-nexus-border bg-nexus-surfaceAlt px-2.5 py-0.5 text-[11px] font-medium text-nexus-muted">
      <Sparkles size={11} />
      Supplementary explanation
    </span>
  );
}
