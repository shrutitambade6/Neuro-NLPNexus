import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react";

import type { ParseTreeNode } from "../services/api";

interface LaidOutNode {
  id: string;
  node: ParseTreeNode;
  parentId: string | null;
  depth: number;
  x: number; // leaf-slot units, not pixels
}

const COL_WIDTH = 92;
const ROW_HEIGHT = 76;
const PADDING = 36;

// Tailwind only picks up class names it can see written out literally in
// source — a template-interpolated `fill-${accentColor}` is invisible to
// its scanner and silently produces no CSS. So every color variant this
// component can use is spelled out in full here, once, and looked up by a
// plain string key instead of being built at runtime.
const COLOR_CLASSES = {
  accent: {
    text: "text-nexus-accent",
    fillSoft: "fill-nexus-accent/10",
    fillStrong: "fill-nexus-accent/20",
    stroke: "stroke-nexus-accent",
    strokeSoft: "stroke-nexus-accent/50",
    arrow: "fill-nexus-accent/70",
  },
  purple: {
    text: "text-nexus-purple",
    fillSoft: "fill-nexus-purple/10",
    fillStrong: "fill-nexus-purple/20",
    stroke: "stroke-nexus-purple",
    strokeSoft: "stroke-nexus-purple/50",
    arrow: "fill-nexus-purple/70",
  },
} as const;

type AccentKey = keyof typeof COLOR_CLASSES;

function layoutTree(tree: ParseTreeNode): { nodes: Record<string, LaidOutNode>; leafCount: number; maxDepth: number } {
  const nodes: Record<string, LaidOutNode> = {};
  let leafCounter = 0;
  let maxDepth = 0;

  function assign(node: ParseTreeNode, id: string, depth: number, parentId: string | null): number {
    maxDepth = Math.max(maxDepth, depth);
    if (node.children.length === 0) {
      const x = leafCounter++;
      nodes[id] = { id, node, parentId, depth, x };
      return x;
    }
    const childXs = node.children.map((child, i) => assign(child, `${id}-${i}`, depth + 1, id));
    const x = childXs.reduce((a, b) => a + b, 0) / childXs.length;
    nodes[id] = { id, node, parentId, depth, x };
    return x;
  }

  assign(tree, "0", 0, null);
  return { nodes, leafCount: Math.max(leafCounter, 1), maxDepth };
}

// Reveal order: "top-down" walks the tree root-first (preorder) — matching
// real top-down derivation, Start Symbol outward. "bottom-up" walks it
// leaves-first (postorder, children before their parent) — matching real
// CYK, smaller constituents combining upward. Same tree, same nodes, only
// the order — and therefore which nodes light up first — differs, which is
// exactly how this component visually communicates construction direction
// without having to draw two differently-shaped trees.
function revealOrder(tree: ParseTreeNode, direction: "top-down" | "bottom-up"): string[] {
  const order: string[] = [];
  function walk(node: ParseTreeNode, id: string) {
    if (direction === "top-down") order.push(id);
    node.children.forEach((child, i) => walk(child, `${id}-${i}`));
    if (direction === "bottom-up") order.push(id);
  }
  walk(tree, "0");
  return order;
}

interface Props {
  tree: ParseTreeNode;
  direction: "top-down" | "bottom-up";
  revealedCount: number; // how many nodes (in direction's own order) are visible so far
  accent?: AccentKey;
}

export default function ParseTreeGraph({ tree, direction, revealedCount, accent = "accent" }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const colors = COLOR_CLASSES[accent];
  const markerId = `arrow-${direction}-${accent}`;

  const { nodes, leafCount, maxDepth } = useMemo(() => layoutTree(tree), [tree]);
  const order = useMemo(() => revealOrder(tree, direction), [tree, direction]);
  const orderIndex = useMemo(() => {
    const m: Record<string, number> = {};
    order.forEach((id, i) => (m[id] = i));
    return m;
  }, [order]);

  const isVisible = (id: string) => (orderIndex[id] ?? 0) < revealedCount;
  const activeId = order[Math.max(0, revealedCount - 1)] ?? null;

  const width = leafCount * COL_WIDTH + PADDING * 2;
  const height = (maxDepth + 1) * ROW_HEIGHT + PADDING * 2;
  const px = (n: LaidOutNode) => n.x * COL_WIDTH + PADDING + COL_WIDTH / 2;
  const py = (n: LaidOutNode) => n.depth * ROW_HEIGHT + PADDING;

  const related = (id: string | null): Set<string> => {
    const set = new Set<string>();
    if (!id || !nodes[id]) return set;
    set.add(id);
    if (nodes[id].parentId) set.add(nodes[id].parentId!);
    Object.values(nodes).forEach((n) => {
      if (n.parentId === id) set.add(n.id);
    });
    return set;
  };
  const highlighted = related(hoveredId ?? selectedId);

  const clampZoom = (z: number) => Math.min(2.5, Math.max(0.5, z));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[11px] text-nexus-muted`}>
          {direction === "top-down" ? (
            <>
              <ArrowDown size={12} className={colors.text} /> Root → Leaves
            </>
          ) : (
            <>
              <ArrowUp size={12} className={colors.text} /> Leaves → Root
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => clampZoom(z - 0.2))}
            title="Zoom out"
            className="rounded-md border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => setZoom((z) => clampZoom(z + 0.2))}
            title="Zoom in"
            className="rounded-md border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset view"
            className="rounded-md border border-nexus-border p-1 text-nexus-muted hover:text-nexus-text hover:border-nexus-accentDim"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-nexus-border bg-nexus-surfaceAlt cursor-grab active:cursor-grabbing"
        style={{ height: Math.min(height * zoom + 20, 420) }}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => clampZoom(z - e.deltaY * 0.001));
        }}
        onMouseDown={(e) => {
          dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        }}
        onMouseMove={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
        }}
        onMouseUp={() => (dragRef.current = null)}
        onMouseLeave={() => (dragRef.current = null)}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
          }}
          className="transition-transform duration-75"
        >
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" className={colors.arrow} />
            </marker>
          </defs>

          {Object.values(nodes)
            .filter((n) => n.parentId)
            .map((n) => {
              const parent = nodes[n.parentId!];
              const childVisible = isVisible(n.id);
              const parentVisible = isVisible(parent.id);
              if (!childVisible || !parentVisible) return null;
              // Direction encodes which end the arrowhead sits on: top-down
              // draws parent -> child (expansion); bottom-up draws
              // child -> parent (combination) — same edge, opposite arrow.
              const [sx, sy, ex, ey] =
                direction === "top-down"
                  ? [px(parent), py(parent) + 16, px(n), py(n) - 16]
                  : [px(n), py(n) - 16, px(parent), py(parent) + 16];
              const isHighlighted = highlighted.has(n.id) && highlighted.has(parent.id);
              return (
                <line
                  key={`edge-${n.id}`}
                  x1={sx}
                  y1={sy}
                  x2={ex}
                  y2={ey}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  className={isHighlighted ? colors.stroke : "stroke-nexus-border"}
                  markerEnd={`url(#${markerId})`}
                />
              );
            })}

          {Object.values(nodes).map((n) => {
            const visible = isVisible(n.id);
            const isActive = n.id === activeId;
            const isHighlighted = highlighted.has(n.id);
            const isLeaf = n.node.children.length === 0;
            return (
              <g
                key={n.id}
                transform={`translate(${px(n)}, ${py(n)})`}
                style={{
                  opacity: visible ? 1 : 0.12,
                  pointerEvents: visible ? "auto" : "none",
                  transition: "opacity 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId((s) => (s === n.id ? null : n.id))}
              >
                <rect
                  x={-26}
                  y={-14}
                  width={52}
                  height={28}
                  rx={8}
                  className={isHighlighted || selectedId === n.id ? colors.fillStrong : colors.fillSoft}
                />
                <rect
                  x={-26}
                  y={-14}
                  width={52}
                  height={28}
                  rx={8}
                  fill="none"
                  className={isHighlighted || selectedId === n.id ? colors.stroke : colors.strokeSoft}
                  strokeWidth={isActive ? 2.5 : 1.5}
                >
                  {isActive && (
                    <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.1s" repeatCount="indefinite" />
                  )}
                </rect>
                <text
                  textAnchor="middle"
                  dy={4}
                  className="fill-nexus-text font-mono font-semibold"
                  style={{ fontSize: 11 }}
                >
                  {n.node.symbol}
                </text>
                {isLeaf && n.node.word && (
                  <text
                    textAnchor="middle"
                    y={28}
                    className="fill-nexus-data font-mono"
                    style={{ fontSize: 10 }}
                  >
                    {n.node.word}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="min-h-[28px] rounded-lg border border-nexus-border bg-nexus-surface px-3 py-1.5 text-xs font-mono text-nexus-muted">
        {selectedId && nodes[selectedId]?.node.rule
          ? <>Rule: <span className="text-nexus-data">{nodes[selectedId].node.rule}</span></>
          : "Click a node to see the grammar rule that produced it."}
      </div>
    </div>
  );
}
