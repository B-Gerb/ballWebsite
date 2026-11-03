/**
 * Pure layered-graph layout for NodeGraph.
 *
 *   layoutGraph(nodes, options) -> { nodes, edges, bounds }
 *
 * Input nodes: `{ id, requires: ['id' | { id, level }], pin?: { col, row } }`.
 * Any other fields are passed through untouched as `data`.
 *
 * Steps
 *   1. Keep only visible nodes; requirements on hidden nodes are dropped.
 *   2. Row = longest path from a root (cycles are reported and broken).
 *   3. Edges that skip rows get invisible "dummy" slots in the rows they
 *      pass through, so they can run straight down a free column.
 *   4. Order each row with a barycenter sweep (top-down, then bottom-up),
 *      ties broken by previous position and then by id.
 *   5. Place each row as close as possible under its parents while keeping
 *      every slot at least `width + gap` apart (isotonic regression).
 *   6. Route elbow edges: each edge between two rows gets its own bend line
 *      inside the band between them, so lines never stack or cross nodes.
 */

const DUMMY_PREFIX = '__dummy:';
const PIN_WEIGHT = 1e6;

const defaultWarn = (message) => {
  if (import.meta.env?.DEV) console.warn(`[graphLayout] ${message}`);
};

/** `'id'` or `{ id, level }` → `{ id, level }` (a bare id means level 1). */
export const normalizeRequirement = (req) =>
  typeof req === 'string' ? { id: req, level: 1 } : { id: req.id, level: req.level ?? 1 };

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Weighted isotonic regression (pool adjacent violators): the
 * non-decreasing sequence closest to `values` in weighted least squares.
 */
function isotonic(values, weights) {
  const blocks = [];
  values.forEach((value, i) => {
    blocks.push({ sum: value * weights[i], weight: weights[i], count: 1 });
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1];
      const prev = blocks[blocks.length - 2];
      if (prev.sum / prev.weight <= last.sum / last.weight) break;
      prev.sum += last.sum;
      prev.weight += last.weight;
      prev.count += last.count;
      blocks.pop();
    }
  });
  return blocks.flatMap((b) => Array(b.count).fill(b.sum / b.weight));
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Assign rows by longest path from a root; break and report cycles. */
function assignRows(ids, parentsOf, pinOf, warn) {
  const row = new Map();
  const visiting = new Set();
  const broken = new Set();

  const visit = (id) => {
    if (row.has(id)) return row.get(id);
    visiting.add(id);
    let depth = 0;
    for (const parent of parentsOf.get(id)) {
      if (visiting.has(parent)) {
        warn(`cycle detected: "${parent}" -> "${id}" is ignored`);
        broken.add(`${parent}->${id}`);
        continue;
      }
      depth = Math.max(depth, visit(parent) + 1);
    }
    const pin = pinOf.get(id);
    if (pin?.row != null) {
      if (pin.row < depth) {
        warn(`"${id}" is pinned to row ${pin.row} but its requirements need row ${depth}`);
      } else {
        depth = pin.row;
      }
    }
    visiting.delete(id);
    row.set(id, depth);
    return depth;
  };

  ids.forEach(visit);
  return { row, broken };
}

/** SVG path through axis-aligned `points` with rounded corners. */
export function roundedPath(points, radius = 10) {
  if (points.length < 2) return '';
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    if (r <= 0) {
      parts.push(`L ${cur.x} ${cur.y}`);
      continue;
    }
    const before = { x: cur.x - ((cur.x - prev.x) / inLen) * r, y: cur.y - ((cur.y - prev.y) / inLen) * r };
    const after = { x: cur.x + ((next.x - cur.x) / outLen) * r, y: cur.y + ((next.y - cur.y) / outLen) * r };
    parts.push(`L ${before.x} ${before.y}`, `Q ${cur.x} ${cur.y} ${after.x} ${after.y}`);
  }
  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);
  return parts.join(' ');
}

export function layoutGraph(
  inputNodes,
  {
    isVisible = () => true,
    nodeSize = { width: 128, height: 112 },
    gap = 24,
    laneSpacing = 10,
    previous = null,
    warn = defaultWarn,
  } = {},
) {
  const { width, height } = nodeSize;
  const pitch = width + gap;

  /* 1. visible nodes, sorted by id for determinism ------------------- */
  const nodes = inputNodes.filter((n) => isVisible(n)).sort((a, b) => byString(a.id, b.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const allIds = new Set(inputNodes.map((n) => n.id));

  const parentsOf = new Map();
  const requirementOf = new Map();
  const pinOf = new Map();
  for (const node of nodes) {
    const parents = [];
    for (const req of (node.requires ?? []).map(normalizeRequirement)) {
      if (!allIds.has(req.id)) {
        warn(`"${node.id}" requires unknown node "${req.id}"`);
        continue;
      }
      if (!byId.has(req.id) || parents.includes(req.id)) continue;
      parents.push(req.id);
      requirementOf.set(`${req.id}->${node.id}`, req);
    }
    parentsOf.set(node.id, parents.sort(byString));
    if (node.pin) pinOf.set(node.id, node.pin);
  }

  /* 2. rows ----------------------------------------------------------- */
  const { row, broken } = assignRows(nodes.map((n) => n.id), parentsOf, pinOf, warn);

  /* 3. edges + dummy slots ------------------------------------------- */
  // Each logical edge becomes a chain of slots: parent, dummy..., child.
  const slots = new Map(); // id -> { id, row, dummy, pin }
  for (const node of nodes) {
    slots.set(node.id, { id: node.id, row: row.get(node.id), dummy: false, pin: pinOf.get(node.id) });
  }

  const logicalEdges = [];
  for (const node of nodes) {
    for (const parent of parentsOf.get(node.id)) {
      const id = `${parent}->${node.id}`;
      if (broken.has(id)) continue;
      const from = row.get(parent);
      const to = row.get(node.id);
      if (to <= from) continue; // only possible through a bad pin; already warned
      const chain = [parent];
      for (let r = from + 1; r < to; r++) {
        const dummyId = `${DUMMY_PREFIX}${id}:${r}`;
        slots.set(dummyId, { id: dummyId, row: r, dummy: true });
        chain.push(dummyId);
      }
      chain.push(node.id);
      logicalEdges.push({ id, from: parent, to: node.id, chain });
    }
  }

  // Slot-level adjacency (always between consecutive rows).
  const up = new Map([...slots.keys()].map((id) => [id, []]));
  const down = new Map([...slots.keys()].map((id) => [id, []]));
  for (const edge of logicalEdges) {
    for (let i = 0; i < edge.chain.length - 1; i++) {
      down.get(edge.chain[i]).push(edge.chain[i + 1]);
      up.get(edge.chain[i + 1]).push(edge.chain[i]);
    }
  }

  /* 4. order within rows --------------------------------------------- */
  const rowCount = slots.size ? Math.max(...[...slots.values()].map((s) => s.row)) + 1 : 0;
  const rows = Array.from({ length: rowCount }, () => []);
  for (const slot of slots.values()) rows[slot.row].push(slot.id);

  const prevX = new Map((previous?.slots ?? []).map((s) => [s.id, s.x]));
  const initialKey = (id) => (prevX.has(id) ? prevX.get(id) : Infinity);
  rows.forEach((ids) =>
    ids.sort((a, b) => initialKey(a) - initialKey(b) || byString(a, b)),
  );

  const indexIn = (ids) => new Map(ids.map((id, i) => [id, i]));

  const sweep = (r, neighbours, neighbourRow) => {
    const pos = indexIn(rows[neighbourRow]);
    const current = indexIn(rows[r]);
    const key = (id) => {
      const pin = slots.get(id).pin;
      if (pin?.col != null) return pin.col;
      const ns = neighbours.get(id);
      return ns.length ? mean(ns.map((n) => pos.get(n))) : current.get(id);
    };
    const keys = new Map(rows[r].map((id) => [id, key(id)]));
    rows[r].sort((a, b) => keys.get(a) - keys.get(b) || current.get(a) - current.get(b));
  };

  for (let r = 1; r < rowCount; r++) sweep(r, up, r - 1);
  for (let r = rowCount - 2; r >= 0; r--) sweep(r, down, r + 1);

  // Stability: nodes that were already on the board keep their relative
  // order; the sweep only decides where newcomers slot in.
  if (prevX.size) {
    rows.forEach((ids, r) => {
      const known = ids.filter((id) => prevX.has(id));
      const sorted = [...known].sort((a, b) => prevX.get(a) - prevX.get(b) || byString(a, b));
      let k = 0;
      rows[r] = ids.map((id) => (prevX.has(id) ? sorted[k++] : id));
    });
  }

  /* 5. x positions (slot centres) ------------------------------------ */
  const centerX = new Map();
  rows.forEach((ids) => {
    const desired = ids.map((id) => {
      const pin = slots.get(id).pin;
      if (pin?.col != null) return pin.col * pitch;
      const parents = up.get(id);
      return parents.length ? mean(parents.map((p) => centerX.get(p))) : null;
    });

    // Parentless slots sit next to their nearest placed neighbour.
    if (desired.every((d) => d === null)) {
      desired.forEach((_, i) => { desired[i] = i * pitch; });
    } else {
      for (let i = 0; i < desired.length; i++) {
        if (desired[i] !== null) continue;
        let j = i - 1;
        while (j >= 0 && desired[j] === null) j--;
        if (j >= 0) {
          desired[i] = desired[j] + (i - j) * pitch;
        } else {
          let k = i + 1;
          while (desired[k] === null) k++;
          desired[i] = desired[k] - (k - i) * pitch;
        }
      }
    }

    const weights = ids.map((id) => (slots.get(id).pin?.col != null ? PIN_WEIGHT : 1));
    const shifted = desired.map((d, i) => d - i * pitch);
    isotonic(shifted, weights).forEach((v, i) => centerX.set(ids[i], v + i * pitch));
  });

  /* 6. row heights + edge bands -------------------------------------- */
  const bandSegments = Array.from({ length: Math.max(0, rowCount - 1) }, () => []);
  for (const edge of logicalEdges) {
    for (let i = 0; i < edge.chain.length - 1; i++) {
      const band = slots.get(edge.chain[i]).row;
      bandSegments[band].push({ edge, index: i });
    }
  }
  const bandHeight = bandSegments.map((segs) => Math.max(gap * 2, (segs.length + 1) * laneSpacing));
  const rowTop = [];
  for (let r = 0, y = 0; r < rowCount; r++) {
    rowTop.push(y);
    y += height + (bandHeight[r] ?? 0);
  }

  // Normalise so nothing is negative.
  const minX = Math.min(
    ...[...slots.values()].map((s) => centerX.get(s.id) - (s.dummy ? 0 : width / 2)),
  );
  const shift = Number.isFinite(minX) ? -minX : 0;
  for (const [id, x] of centerX) centerX.set(id, x + shift);

  /* 7. edge ports (spread over the bottom / top edges) --------------- */
  const portOffset = (count, index) => {
    if (count <= 1) return 0;
    const step = Math.min(16, (width * 0.6) / (count - 1));
    return (index - (count - 1) / 2) * step;
  };
  const outPort = new Map(); // `${slot}|${next}` -> x
  const inPort = new Map();
  for (const id of slots.keys()) {
    const isDummy = slots.get(id).dummy;
    const outs = [...down.get(id)].sort((a, b) => centerX.get(a) - centerX.get(b) || byString(a, b));
    outs.forEach((next, i) => {
      outPort.set(`${id}|${next}`, centerX.get(id) + (isDummy ? 0 : portOffset(outs.length, i)));
    });
    const ins = [...up.get(id)].sort((a, b) => centerX.get(a) - centerX.get(b) || byString(a, b));
    ins.forEach((prev, i) => {
      inPort.set(`${prev}|${id}`, centerX.get(id) + (isDummy ? 0 : portOffset(ins.length, i)));
    });
  }

  /* 8. bend lanes: one per segment, ordered by start x --------------- */
  const bendY = new Map(); // `${edgeId}#${index}` -> y
  bandSegments.forEach((segs, band) => {
    const withX = segs.map((seg) => {
      const a = seg.edge.chain[seg.index];
      const b = seg.edge.chain[seg.index + 1];
      return { ...seg, sx: outPort.get(`${a}|${b}`), tx: inPort.get(`${a}|${b}`) };
    });
    withX.sort((p, q) => p.sx - q.sx || p.tx - q.tx || byString(p.edge.id, q.edge.id));
    const top = rowTop[band] + height;
    const step = bandHeight[band] / (withX.length + 1);
    withX.forEach((seg, i) => bendY.set(`${seg.edge.id}#${seg.index}`, top + step * (i + 1)));
  });

  /* 9. edge polylines ------------------------------------------------ */
  const edges = logicalEdges.map((edge) => {
    const points = [];
    const bends = [];
    const push = (x, y) => {
      const last = points[points.length - 1];
      if (last && last.x === x && last.y === y) return;
      // Merge collinear runs so each straight segment is one segment.
      const prev = points[points.length - 2];
      if (prev && last && ((prev.x === last.x && last.x === x) || (prev.y === last.y && last.y === y))) {
        points[points.length - 1] = { x, y };
        return;
      }
      points.push({ x, y });
    };

    for (let i = 0; i < edge.chain.length - 1; i++) {
      const a = edge.chain[i];
      const b = edge.chain[i + 1];
      const band = slots.get(a).row;
      const sx = outPort.get(`${a}|${b}`);
      const tx = inPort.get(`${a}|${b}`);
      const y = bendY.get(`${edge.id}#${i}`);
      push(sx, rowTop[band] + height);
      push(sx, y);
      push(tx, y);
      push(tx, rowTop[band + 1]);
      bends.push({ band, y });
    }

    const path = roundedPath(points);
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      level: requirementOf.get(edge.id)?.level ?? 1,
      points,
      bends,
      path,
    };
  });
  edges.sort((a, b) => byString(a.id, b.id));

  /* 10. output -------------------------------------------------------- */
  const placed = nodes.map((node) => {
    const cx = centerX.get(node.id);
    const r = row.get(node.id);
    return {
      id: node.id,
      row: r,
      x: cx - width / 2,
      y: rowTop[r],
      width,
      height,
      cx,
      cy: rowTop[r] + height / 2,
      data: node,
    };
  });
  placed.sort((a, b) => a.row - b.row || a.x - b.x);

  const maxX = Math.max(0, ...[...slots.values()].map((s) => centerX.get(s.id) + (s.dummy ? 0 : width / 2)));
  const maxY = rowCount ? rowTop[rowCount - 1] + height : 0;

  return {
    nodes: placed,
    edges,
    // Slot positions (dummies included) so the next layout can stay stable.
    slots: [...slots.keys()].sort(byString).map((id) => ({ id, x: centerX.get(id) })),
    bounds: { minX: 0, minY: 0, maxX, maxY },
  };
}
