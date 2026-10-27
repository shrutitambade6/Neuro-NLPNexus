// Spec point 8 — the small legend. Text + swatch together, never color
// alone (point 19/28 accessibility rule).
export default function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-nexus-muted">
      <LegendDot colorClass="bg-nexus-good" label="Strong" />
      <LegendDot colorClass="bg-nexus-gold" label="Developing" />
      <LegendDot colorClass="bg-nexus-bad" label="Needs Attention" />
      <LegendDot colorClass="bg-nexus-muted" label="Not Started" />
      <LegendDot colorClass="bg-nexus-border" label="Locked" />
      <LegendLine style="solid" label="Prerequisite" />
      <LegendLine style="dashed" label="Related" />
      <LegendLine style="thick" label="Cross-domain" />
    </div>
  );
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} /> {label}
    </span>
  );
}

function LegendLine({ style, label }: { style: "solid" | "dashed" | "thick"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="18" height="6" aria-hidden>
        <line
          x1="0" y1="3" x2="18" y2="3"
          className={style === "thick" ? "stroke-nexus-accent" : "stroke-nexus-muted"}
          strokeWidth={style === "thick" ? 3 : 1.5}
          strokeDasharray={style === "dashed" ? "4,3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}
