import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  Code2,
  FlaskConical,
  HelpCircle,
  Lightbulb,
  Sigma,
} from "lucide-react";

import type { BookAccentToken } from "../../utils/bookAccents";
import { BOOK_ACCENT_CLASSES } from "../../utils/bookAccents";
import type { ContentBlock } from "../../utils/bookBlocks";
import { PAPER_BG_SOFT, PAPER_EDGE, PAPER_INK, PAPER_INK_SOFT } from "./paperTexture";

interface Props {
  blocks: ContentBlock[];
  accent: BookAccentToken;
}

// Renders one chapter page's worth of real content blocks. Deliberately
// uses lucide-react icons (already a dependency, already this engine's
// icon language — see BookCover/BookControls) rather than literal emoji
// glyphs for each callout's badge: same "Definition / Example / Important
// / Tip" distinction the spec asks for, in the visual language the rest
// of this book — and the rest of the app — already uses.
//
// Colors are the fixed warm-paper ink tokens (paperTexture.ts), not the
// theme-reactive nexus-* tokens: this is prose sitting on physical paper,
// which this engine deliberately keeps constant across the site's light/
// dark toggle (see paperTexture.ts's own header comment).
function Callout({
  icon: Icon,
  label,
  tint,
  text,
}: {
  icon: typeof Lightbulb;
  label: string;
  tint: string;
  text: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed"
      style={{ borderColor: PAPER_EDGE, backgroundColor: PAPER_BG_SOFT }}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tint }}>
        <Icon size={13} /> {label}
      </p>
      <p style={{ color: PAPER_INK }}>{text}</p>
    </div>
  );
}

export default function ContentBlocks({ blocks, accent }: Props) {
  const accentClasses = BOOK_ACCENT_CLASSES[accent];
  // The accent tokens are Tailwind classes (for borders/pills elsewhere in
  // this engine); callouts here need a plain CSS color string instead, so
  // each accent token maps to one fixed hex rather than re-deriving one
  // from a Tailwind class name at runtime.
  const accentHex: Record<BookAccentToken, string> = {
    purple: "#7C5CBF",
    gold: "#B8860B",
    accent: "#1687FF",
    data: "#1C8C7A",
  };
  const tint = accentHex[accent];

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "paragraph":
            return (
              <p key={i} className="text-[13px] leading-relaxed" style={{ color: PAPER_INK_SOFT }}>
                {block.text}
              </p>
            );
          case "subheading":
            return (
              <p
                key={i}
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${accentClasses.text} pt-1`}
              >
                {block.text}
              </p>
            );
          case "definition":
            return <Callout key={i} icon={BookOpenText} label={block.label ?? "Definition"} tint={tint} text={block.text} />;
          case "example":
            return <Callout key={i} icon={FlaskConical} label={block.label ?? "Example"} tint={tint} text={block.text} />;
          case "important":
            return <Callout key={i} icon={AlertTriangle} label={block.label ?? "Important"} tint={tint} text={block.text} />;
          case "tip":
            return <Callout key={i} icon={Lightbulb} label={block.label ?? "Learning Tip"} tint={tint} text={block.text} />;
          case "thinkAboutIt":
            return <Callout key={i} icon={HelpCircle} label={block.label ?? "Think About It"} tint={tint} text={block.text} />;
          case "formula":
            return (
              <div key={i} className="rounded-lg border px-3.5 py-3" style={{ borderColor: PAPER_EDGE, backgroundColor: PAPER_BG_SOFT }}>
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tint }}>
                  <Sigma size={13} /> {block.label ?? "Formula"}
                </p>
                <p className="text-center font-mono text-[13px]" style={{ color: PAPER_INK }}>
                  {block.formula}
                </p>
                {block.note && (
                  <p className="mt-1.5 text-[11px] italic" style={{ color: PAPER_INK_SOFT }}>
                    {block.note}
                  </p>
                )}
              </div>
            );
          case "code":
            return (
              <div key={i} className="rounded-lg border px-3.5 py-3" style={{ borderColor: PAPER_EDGE, backgroundColor: "#2B2620" }}>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                  <Code2 size={13} /> {block.label ?? "Code"}
                </p>
                <pre className="overflow-x-auto whitespace-pre text-[11px] leading-relaxed text-white/90">{block.code}</pre>
              </div>
            );
          case "keyTerms":
            return (
              <div key={i} className="flex flex-wrap gap-1.5">
                {block.terms.map((term) => (
                  <span
                    key={term}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${accentClasses.border} ${accentClasses.bgSoft} ${accentClasses.text}`}
                  >
                    {term}
                  </span>
                ))}
              </div>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-lg border" style={{ borderColor: PAPER_EDGE }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ backgroundColor: PAPER_BG_SOFT }}>
                      {block.headers.map((h) => (
                        <th key={h} className="px-2.5 py-1.5 text-left font-semibold" style={{ color: PAPER_INK }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderTop: `1px solid ${PAPER_EDGE}` }}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-2.5 py-1.5" style={{ color: PAPER_INK_SOFT }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "flow":
            return (
              <div key={i} className="flex flex-col items-center gap-1 py-1">
                {block.steps.map((step, si) => (
                  <div key={si} className="flex flex-col items-center">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${accentClasses.border} ${accentClasses.bgSoft}`}
                      style={{ color: PAPER_INK }}
                    >
                      {step}
                    </span>
                    {si < block.steps.length - 1 && (
                      <span className="text-[11px]" style={{ color: PAPER_INK_SOFT }}>
                        ↓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          case "recap":
            return (
              <div key={i} className="rounded-lg border px-3.5 py-3" style={{ borderColor: PAPER_EDGE, backgroundColor: PAPER_BG_SOFT }}>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: tint }}>
                  <CheckCircle2 size={13} /> Quick Recap
                </p>
                <ul className="space-y-1">
                  {block.points.map((p, pi) => (
                    <li key={pi} className="flex gap-1.5 text-[13px] leading-relaxed" style={{ color: PAPER_INK }}>
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: tint }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case "glossaryList":
            return (
              <div key={i} className="space-y-2.5">
                {block.entries.map((entry) => (
                  <div key={entry.term}>
                    <p className="text-[13px] font-semibold" style={{ color: PAPER_INK }}>
                      {entry.term}
                    </p>
                    <p className="text-[12px] leading-relaxed" style={{ color: PAPER_INK_SOFT }}>
                      {entry.definition}
                    </p>
                  </div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
