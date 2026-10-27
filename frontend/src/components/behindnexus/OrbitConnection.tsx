// A single glowing line from the Nexus core to one orbiting node (spec
// section 4/6: "connecting lines" that "become brighter" on hover/focus).
// Lives INSIDE the same rotating ring <motion.div> as its matching
// MentorNode (see NexusOrbit.tsx) — both the node and this line are
// positioned by the same fixed polar(angle, radius) point, so as the
// ring rotates they sweep together and the line always lands exactly on
// the node, with no per-frame recalculation needed.
interface Props {
  toX: number; // SVG-space (0-100 viewBox) endpoint, from the same
  toY: number; // polar() helper NexusOrbit.tsx uses for node placement.
  color: string; // an rgb(var(--nexus-...)) triplet, no alpha wrapper
  bright: boolean; // hovered/focused — spec: "connection line becomes brighter"
  dimmed: boolean; // a different node is focused — fade this one back
}

export default function OrbitConnection({ toX, toY, color, bright, dimmed }: Props) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 100 100"
    >
      <line
        x1={50}
        y1={50}
        x2={toX}
        y2={toY}
        stroke={`rgb(${color} / ${dimmed ? 0.12 : bright ? 0.85 : 0.4})`}
        strokeWidth={bright ? 0.5 : 0.25}
        style={{ transition: "stroke 0.25s ease, stroke-width 0.25s ease" }}
      />
    </svg>
  );
}
