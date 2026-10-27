import { useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Lock, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";

import type { ConceptEdge, ConceptState } from "../../services/api";
import { computeConceptLayout } from "../../utils/conceptDnaLayout";
import { CROSS_DOMAIN_STROKE, STATUS_NODE_CLASSES } from "./conceptDnaTheme";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.8;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

interface Props {
  concepts: ConceptState[];
  edges: ConceptEdge[];
  visibleIds: Set<string>;
  selectedId: string | null;
  recommendedId?: string | null;
  onSelect: (id: string) => void;
}

// The interactive knowledge graph itself (spec section 5 — "the MAIN
// FEATURE"). A hand-rolled SVG renderer over a deterministic layered
// layout (utils/conceptDnaLayout.ts), not a physics simulation and not a
// third-party graph library (point 16) — positions are a pure function of
// the data, so nothing re-simulates or jitters on click/filter/zoom.
// Pan/zoom/drag interaction mirrors the project's own existing SVG graph
// (components/ParseTreeGraph.tsx), with touch support added for point 18.
export default function ConceptGraph({ concepts, edges, visibleIds, selectedId, recommendedId, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  const layout = useMemo(() => computeConceptLayout(concepts), [concepts]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const px = (id: string) => layout.nodes[id]?.x ?? 0;
  const py = (id: string) => layout.nodes[id]?.y ?? 0;

  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current = { startX: clientX, startY: clientY, panX: pan.x, panY: pan.y };
  };
  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const endDrag = () => (dragRef.current = null);

  const viewHeight = Math.min(layout.height + 40, 560);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setZoom((z) => clampZoom(z - 0.15))}
          title="Zoom out"
          className="rounded-md border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={() => setZoom((z) => clampZoom(z + 0.15))}
          title="Zoom in"
          className="rounded-md border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
        >
          <Plus size={13} />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          title="Reset graph"
          className="rounded-md border border-nexus-border p-1.5 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-nexus-border bg-nexus-surfaceAlt cursor-grab active:cursor-grabbing touch-none"
        style={{ height: viewHeight }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => clampZoom(z - e.deltaY * 0.001));
        }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) startDrag(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) moveDrag(t.clientX, t.clientY);
        }}
        onTouchEnd={endDrag}
      >
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "top left" }}
          className={reduceMotion ? "" : "transition-transform duration-75"}
        >
          {edges.map((edge, i) => {
            if (!visibleIds.has(edge.source_id) || !visibleIds.has(edge.target_id)) return null;
            if (!layout.nodes[edge.source_id] || !layout.nodes[edge.target_id]) return null;
            const x1 = px(edge.source_id);
            const y1 = py(edge.source_id);
            const x2 = px(edge.target_id);
            const y2 = py(edge.target_id);
            const dashed = edge.relationship_type === "related" && !edge.cross_domain;
            const strokeClass = edge.cross_domain
              ? CROSS_DOMAIN_STROKE
              : edge.completed_both
              ? "stroke-nexus-accent"
              : "stroke-nexus-border";
            return (
              <line
                key={`edge-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={strokeClass}
                strokeWidth={edge.cross_domain ? 3.5 : edge.completed_both ? 2.2 : 1.3}
                strokeDasharray={dashed ? "5,5" : undefined}
                opacity={edge.cross_domain || edge.completed_both ? 0.9 : 0.5}
              />
            );
          })}

          {concepts.map((concept) => {
            if (!visibleIds.has(concept.id)) return null;
            const pos = layout.nodes[concept.id];
            if (!pos) return null;
            const classes = STATUS_NODE_CLASSES[concept.status];
            const isSelected = selectedId === concept.id;
            const isRecommended = recommendedId === concept.id;
            const isLocked = concept.status === "locked";
            return (
              <g
                key={concept.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.55 : 1 }}
                onMouseEnter={() => setHoveredId(concept.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect(concept.id)}
                tabIndex={0}
                role="button"
                aria-label={`${concept.label} — ${concept.status.replace("_", " ")}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(concept.id);
                  }
                }}
              >
                {isRecommended && !reduceMotion && (
                  <circle r={30} className={`${classes.stroke} fill-none`} strokeWidth={1.5} opacity={0.6}>
                    <animate attributeName="r" values="26;34;26" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  r={26}
                  className={isSelected ? classes.fill : classes.fillSoft}
                  stroke="currentColor"
                />
                <circle
                  r={26}
                  fill="none"
                  className={classes.stroke}
                  strokeWidth={isSelected || hoveredId === concept.id ? 2.5 : 1.5}
                />
                {isLocked && (
                  <g transform="translate(-6, -6)">
                    <Lock size={12} className="text-nexus-muted" />
                  </g>
                )}
                <text
                  textAnchor="middle"
                  dy={42}
                  className="fill-nexus-text font-sans"
                  style={{ fontSize: 10, fontWeight: isSelected ? 700 : 500 }}
                >
                  {concept.label.length > 16 ? `${concept.label.slice(0, 15)}…` : concept.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredId && layout.nodes[hoveredId] && visibleIds.has(hoveredId) && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-nexus-border bg-nexus-surface p-2.5 text-xs shadow-xl"
            style={{
              left: Math.min(layout.width - 220, Math.max(8, layout.nodes[hoveredId].x * zoom + pan.x - 90)),
              top: Math.max(4, layout.nodes[hoveredId].y * zoom + pan.y - 10),
            }}
          >
            <p className="font-semibold text-nexus-text mb-0.5">{layout.nodes[hoveredId].concept.label}</p>
            <p className="text-nexus-muted">{layout.nodes[hoveredId].concept.description}</p>
          </div>
        )}
      </div>
      <p className="flex items-center gap-1 text-[11px] text-nexus-muted">
        <Maximize2 size={11} /> Scroll to zoom, drag to pan — or use the controls above.
      </p>
    </div>
  );
}
