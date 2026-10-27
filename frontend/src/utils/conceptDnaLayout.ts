import type { ConceptState } from "../services/api";

export interface GraphNodePosition {
  id: string;
  x: number;
  y: number;
  concept: ConceptState;
}

export interface GraphLayout {
  nodes: Record<string, GraphNodePosition>;
  width: number;
  height: number;
}

const ROW_HEIGHT = 108;
const COL_WIDTH = 150;
const PAD_X = 90;
const PAD_Y = 70;

/**
 * Concept DNA's graph layout — a deterministic, layered DAG layout (depth
 * = longest prerequisite chain from a root), NOT a physics/force
 * simulation. Point 16 of the spec explicitly asks to avoid a "massive
 * graph library" and keep the graph responsive; a fixed, computed layout
 * means positions never jitter or need re-simulation on every render —
 * they're a pure function of the concepts/edges the backend returned.
 * Within a tier, NLP concepts sort before DL concepts and are centered
 * as a group, so the graph visually reads the same way the spec's own
 * ASCII diagram does: NLP branches near the top, cascading down into
 * Deep Learning, converging through the cross-domain bridges.
 */
export function computeConceptLayout(concepts: ConceptState[]): GraphLayout {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const depthCache = new Map<string, number>();

  function depthOf(id: string, path: Set<string>): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (path.has(id)) return 0; // cycle guard — concept_catalog.py is hand-curated and acyclic, but never trust that blindly in a layout function
    const concept = byId.get(id);
    if (!concept || concept.prerequisite_ids.length === 0) {
      depthCache.set(id, 0);
      return 0;
    }
    const nextPath = new Set(path);
    nextPath.add(id);
    const depth =
      1 +
      Math.max(
        0,
        ...concept.prerequisite_ids.filter((p) => byId.has(p)).map((p) => depthOf(p, nextPath))
      );
    depthCache.set(id, depth);
    return depth;
  }

  const tiers = new Map<number, ConceptState[]>();
  for (const c of concepts) {
    const d = depthOf(c.id, new Set());
    if (!tiers.has(d)) tiers.set(d, []);
    tiers.get(d)!.push(c);
  }

  const sortedTierKeys = [...tiers.keys()].sort((a, b) => a - b);
  let maxCols = 0;
  for (const key of sortedTierKeys) {
    const row = tiers.get(key)!;
    row.sort((a, b) => (a.domain === b.domain ? a.id.localeCompare(b.id) : a.domain === "nlp" ? -1 : 1));
    maxCols = Math.max(maxCols, row.length);
  }

  const nodes: Record<string, GraphNodePosition> = {};
  const totalWidth = Math.max(0, (maxCols - 1) * COL_WIDTH);

  for (const key of sortedTierKeys) {
    const row = tiers.get(key)!;
    const rowWidth = Math.max(0, (row.length - 1) * COL_WIDTH);
    const offset = (totalWidth - rowWidth) / 2;
    row.forEach((concept, i) => {
      nodes[concept.id] = {
        id: concept.id,
        x: PAD_X + offset + i * COL_WIDTH,
        y: PAD_Y + key * ROW_HEIGHT,
        concept,
      };
    });
  }

  return {
    nodes,
    width: PAD_X * 2 + totalWidth,
    height: PAD_Y * 2 + Math.max(0, (sortedTierKeys.length - 1) * ROW_HEIGHT),
  };
}
