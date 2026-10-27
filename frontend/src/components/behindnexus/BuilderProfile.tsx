// Detail-panel content for the Builder node (spec section 9/10): the
// user's own verbatim opening lines, the animated skill chips (not
// claims of professional experience — just the given list), and a
// "CONNECT WITH THE BUILDER →" button linking to the given LinkedIn URL
// in a new tab, no embed, no login.
import { ArrowUpRight } from "lucide-react";

import { BUILDER } from "../../data/behindNexus";
import { StaggerContainer, StaggerItem } from "../../motion/primitives";
import { nexusVar } from "../../utils/theme";

export default function BuilderProfile() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: nexusVar("data") }}>
          {BUILDER.role}
        </p>
        <h3 className="mt-1 text-xl font-semibold text-nexus-text">{BUILDER.name}</h3>
        <p className="text-sm text-nexus-muted">{BUILDER.subtitle}</p>
      </div>

      <div className="space-y-2">
        {BUILDER.openingLines.map((line, i) => (
          <p key={i} className="text-sm leading-relaxed text-nexus-text/90">
            {line}
          </p>
        ))}
      </div>

      <StaggerContainer className="flex flex-wrap gap-2">
        {BUILDER.skills.map((skill) => (
          <StaggerItem key={skill}>
            <span
              className="inline-block rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{ borderColor: nexusVar("data", 0.4), color: nexusVar("data"), background: nexusVar("data", 0.08) }}
            >
              {skill}
            </span>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <a
        href={BUILDER.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:brightness-110"
        style={{ background: nexusVar("data") }}
      >
        CONNECT WITH THE BUILDER <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
