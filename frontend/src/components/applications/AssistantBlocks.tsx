import { useState } from "react";
import { Check, Copy } from "lucide-react";

import type { AssistantBlock } from "../../services/api";

/** Renders one structured block from the NLP Learning Assistant's response.
 * The backend never sends a wall of prose — it sends typed blocks (heading,
 * text, bullets, code, table, formula, callout) so the UI can give each kind
 * of content its own visual treatment instead of one giant paragraph. */
export function AssistantBlockView({ block }: { block: AssistantBlock }) {
  switch (block.type) {
    case "heading":
      return <p className="font-display text-sm font-semibold text-nexus-text tracking-wide">{block.text}</p>;
    case "text":
      return <p className="text-sm text-nexus-text leading-relaxed">{block.text}</p>;
    case "bullets":
      return (
        <ul className="space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-nexus-text flex gap-2">
              <span className="text-nexus-accent">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "code":
      return <CodeBlock code={block.code} />;
    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-nexus-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-nexus-surfaceAlt">
                {block.headers.map((h) => (
                  <th key={h} className="text-left font-semibold text-nexus-text px-3 py-2 border-b border-nexus-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "" : "bg-nexus-surfaceAlt/40"}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-nexus-muted align-top border-b border-nexus-border/50">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "formula":
      return (
        <div className="rounded-lg border border-nexus-gold/30 bg-nexus-gold/5 px-3 py-2.5 space-y-1">
          <p className="font-mono text-sm text-nexus-gold">{block.formula}</p>
          {block.explanation && <p className="text-xs text-nexus-muted">{block.explanation}</p>}
        </div>
      );
    case "callout":
      return (
        <div className="rounded-lg border border-nexus-border bg-nexus-surfaceAlt px-3 py-2 text-sm text-nexus-text flex gap-2">
          <span className="shrink-0">{block.icon}</span>
          <span>{block.text}</span>
        </div>
      );
    default:
      return null;
  }
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail silently, the code is still visible to select manually.
    }
  };
  return (
    <div className="relative rounded-lg border border-nexus-border bg-nexus-bg">
      <pre className="overflow-x-auto p-3 text-xs font-mono text-nexus-text whitespace-pre-wrap">{code}</pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-nexus-border bg-nexus-surface px-2 py-1 text-[10px] text-nexus-muted hover:text-nexus-accent transition-colors"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy Code"}
      </button>
    </div>
  );
}

export function AssistantBlockList({ blocks }: { blocks: AssistantBlock[] }) {
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => (
        <AssistantBlockView key={i} block={b} />
      ))}
    </div>
  );
}
