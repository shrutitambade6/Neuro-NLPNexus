// Detail-panel content for a faculty mentor node (spec sections 7/8):
// name, role, institution, the user's own verbatim appreciation text
// (data/behindNexus.ts — never edit that wording here), and a "VIEW
// FACULTY PROFILE →" button that opens the official VIT page in a new
// tab. No bio/achievement text is invented here beyond what the spec
// itself supplied — this component only lays the given strings out.
import { ArrowUpRight } from "lucide-react";

import type { MentorContent } from "../../data/behindNexus";
import { nexusVar } from "../../utils/theme";

export default function MentorProfile({ mentor }: { mentor: MentorContent }) {
  return (
    <div className="space-y-4">
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: nexusVar(mentor.colorToken) }}
        >
          {mentor.role}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-nexus-text">{mentor.name}</h3>
        <p className="text-sm text-nexus-muted">{mentor.institution}</p>
      </div>

      <p className="text-sm leading-relaxed text-nexus-text/90">{mentor.appreciation}</p>

      <a
        href={mentor.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
        style={{ background: nexusVar(mentor.colorToken) }}
      >
        VIEW FACULTY PROFILE <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
