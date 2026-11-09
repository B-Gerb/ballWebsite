/**
 * Pure radial ("constellation") layout for NodeGraph.
 *
 *   layoutRadial(nodes, options) -> { nodes, edges, bounds, extent }
 *
 * The root sits in the middle and every branch grows outward in its own
 * direction, like a star chart. Each node's first requirement is its
 * "primary parent" (the tree it hangs from); extra requirements still get a
 * line but don't affect placement.
 *
 * Positions are computed from ALL nodes, visible or not, so a node keeps
 * its slot forever: unlocking something never shuffles the rest. Only the
 * visible nodes/edges are returned, and `bounds` hugs those (for the
 * camera). `extent` is the size of the whole board (for the SVG layer).
 *
 * Steps
 *   1. Primary parent = first requirement naming a known node (cycles cut).
 *   2. Each subtree gets an angular wedge proportional to its leaf count;
 *      a node sits at the middle of its wedge.
 *   3. Ring radius per depth: at least one node-footprint further out than
 *      the previous ring, and wide enough that the two closest nodes on the
 *      ring are a full footprint apart (chord length).
 */
import { normalizeRequirement } from './graphLayout.js';

const START_ANGLE = -Math.PI / 2; // first branch points up

export function layoutRadial(
  inputNodes,
  { isVisible = () => true, nodeSize = { width: 128, height: 112 }, gap = 24 } = {},
) {
  const { width, height } = nodeSize;
  const pitch = Math.hypot(width, height) + gap;
  const ids = new Set(inputNodes.map((n) => n.id));

  /* 1. primary-parent tree ------------------------------------------- */
  const parentOf = new Map();
  const children = new Map(inputNodes.map((n) => [n.id, []]));
  const reqs = new Map(
    inputNodes.map((n) => [n.id, (n.requires ?? []).map(normalizeRequirement).filter((r) => ids.has(r.id))]),
  );
  const leadsTo = (from, target) => {
    for (let cur = from; cur != null; cur = parentOf.get(cur)) if (cur === target) return true;
    return false;
  };
  for (const node of inputNodes) {
    const primary = reqs.get(node.id).find((r) => !leadsTo(r.id, node.id));
    if (primary) {
      parentOf.set(node.id, primary.id);
      children.get(primary.id).push(node.id);
    }
  }
  const roots = inputNodes.filter((n) => !parentOf.has(n.id)).map((n) => n.id);

  // A lone root goes in the middle; several roots share a virtual centre.
  const CENTER = Symbol('center');
  const kids = (id) => (id === CENTER ? roots : children.get(id));
  const top = roots.length === 1 ? roots[0] : CENTER;

  /* 2. wedges by leaf count ------------------------------------------ */
  const leaves = new Map();
  const countLeaves = (id) => {
    const ks = kids(id);
    const n = ks.length ? ks.reduce((s, k) => s + countLeaves(k), 0) : 1;
    leaves.set(id, n);
    return n;
  };
  countLeaves(top);

  const angle = new Map();
  const depth = new Map();
  const assign = (id, start, span, d) => {
    angle.set(id, start + span / 2);
    depth.set(id, d);
    let cursor = start;
    for (const k of kids(id)) {
      const share = (span * leaves.get(k)) / leaves.get(id);
      assign(k, cursor, share, d + 1);
      cursor += share;
    }
  };
  assign(top, START_ANGLE, Math.PI * 2, 0);

  /* 3. ring radii ---------------------------------------------------- */
  const rings = [];
  for (const [id, d] of depth) {
    if (id === CENTER || d === 0) continue;
    (rings[d] ??= []).push(angle.get(id));
  }
  const radius = [0];
  for (let d = 1; d < rings.length; d++) {
    const angles = (rings[d] ?? []).slice().sort((a, b) => a - b);
    let minSep = Math.PI * 2;
    for (let i = 0; i < angles.length; i++) {
      const next = i + 1 < angles.length ? angles[i + 1] : angles[0] + Math.PI * 2;
      if (angles.length > 1) minSep = Math.min(minSep, next - angles[i]);
    }
    const chordNeed = angles.length > 1 ? pitch / (2 * Math.sin(Math.min(minSep, Math.PI) / 2)) : 0;
    radius[d] = Math.max(radius[d - 1] + pitch, chordNeed);
  }

  /* positions (all nodes), shifted so the whole board starts at 0,0 --- */
  const raw = new Map();
  for (const node of inputNodes) {
    const r = radius[depth.get(node.id)] ?? 0;
    const a = angle.get(node.id);
    raw.set(node.id, { cx: r * Math.cos(a), cy: r * Math.sin(a) });
  }
  const all = [...raw.values()];
  const shiftX = all.length ? -Math.min(...all.map((p) => p.cx)) + width / 2 : 0;
  const shiftY = all.length ? -Math.min(...all.map((p) => p.cy)) + height / 2 : 0;

  const placedAll = inputNodes.map((node) => {
    const cx = raw.get(node.id).cx + shiftX;
    const cy = raw.get(node.id).cy + shiftY;
    return {
      id: node.id,
      row: depth.get(node.id),
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
      cx,
      cy,
      data: node,
    };
  });

  const extent = {
    maxX: Math.max(0, ...placedAll.map((n) => n.x + width)),
    maxY: Math.max(0, ...placedAll.map((n) => n.y + height)),
  };

  /* visible output --------------------------------------------------- */
  const visible = placedAll.filter((n) => isVisible(n.data));
  const shown = new Map(visible.map((n) => [n.id, n]));

  const edges = [];
  for (const node of visible) {
    for (const req of reqs.get(node.id)) {
      const from = shown.get(req.id);
      if (!from) continue;
      const points = [{ x: from.cx, y: from.cy }, { x: node.cx, y: node.cy }];
      edges.push({
        id: `${req.id}->${node.id}`,
        from: req.id,
        to: node.id,
        level: req.level,
        primary: parentOf.get(node.id) === req.id,
        points,
        path: `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`,
      });
    }
  }

  const bounds = visible.length
    ? {
        minX: Math.min(...visible.map((n) => n.x)),
        minY: Math.min(...visible.map((n) => n.y)),
        maxX: Math.max(...visible.map((n) => n.x + width)),
        maxY: Math.max(...visible.map((n) => n.y + height)),
      }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  return { nodes: visible, edges, bounds, extent };
}
