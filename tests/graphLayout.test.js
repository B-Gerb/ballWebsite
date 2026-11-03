import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutGraph } from '../src/components/whiteboard/graphLayout.js';
import { PRESTIGE_NODES } from '../src/data/prestigeTree.js';

const nodeSize = { width: 128, height: 112 };
const gap = 24;

const reqIds = (node) => (node.requires ?? []).map((r) => (typeof r === 'string' ? r : r.id));

/** Visible sets that mirror real unlock stages of the prestige tree. */
const stages = {
  'everything visible': () => true,
  'only roots visible': (node) => reqIds(node).length === 0,
  'after Unlock Triangle': (node) =>
    ['unlock-triangle', 'unlock-square', 'circle-wall-value'].includes(node.id),
  'after Unlock Square': (node) =>
    ['unlock-triangle', 'unlock-square', 'circle-wall-value', 'triangle-value', 'square-value']
      .includes(node.id),
};

const layoutFor = (isVisible) => layoutGraph(PRESTIGE_NODES, { isVisible, nodeSize, gap });

const rectsOverlapWithGap = (a, b, minGap) =>
  a.x < b.x + b.width + minGap
  && b.x < a.x + a.width + minGap
  && a.y < b.y + b.height + minGap
  && b.y < a.y + a.height + minGap;

/** Does an axis-aligned segment pass through the inside of a rect? */
const segmentHitsRect = (p, q, r) => {
  const minX = Math.min(p.x, q.x);
  const maxX = Math.max(p.x, q.x);
  const minY = Math.min(p.y, q.y);
  const maxY = Math.max(p.y, q.y);
  return minX < r.x + r.width && maxX > r.x && minY < r.y + r.height && maxY > r.y;
};

for (const [stage, isVisible] of Object.entries(stages)) {
  test(`[${stage}] lays out exactly the visible nodes`, () => {
    const layout = layoutFor(isVisible);
    const expected = PRESTIGE_NODES.filter(isVisible).map((n) => n.id).sort();
    assert.deepEqual(layout.nodes.map((n) => n.id).sort(), expected);
  });

  test(`[${stage}] no two node footprints overlap and every pair is at least gap apart`, () => {
    const { nodes } = layoutFor(isVisible);
    for (let i = 0; i < nodes.length; i++) {
      assert.equal(nodes[i].width, nodeSize.width);
      assert.equal(nodes[i].height, nodeSize.height);
      for (let j = i + 1; j < nodes.length; j++) {
        assert.ok(
          !rectsOverlapWithGap(nodes[i], nodes[j], gap),
          `${nodes[i].id} and ${nodes[j].id} are closer than ${gap}px`,
        );
      }
    }
  });

  test(`[${stage}] no two edges in the same band share a bend y`, () => {
    const { edges } = layoutFor(isVisible);
    const seen = new Map();
    for (const edge of edges) {
      for (const bend of edge.bends) {
        const key = `${bend.band}:${bend.y}`;
        assert.ok(!seen.has(key), `${edge.id} shares bend ${key} with ${seen.get(key)}`);
        seen.set(key, edge.id);
      }
    }
  });

  test(`[${stage}] no edge segment crosses a node other than its own two`, () => {
    const { nodes, edges } = layoutFor(isVisible);
    for (const edge of edges) {
      for (let i = 0; i < edge.points.length - 1; i++) {
        const p = edge.points[i];
        const q = edge.points[i + 1];
        assert.ok(p.x === q.x || p.y === q.y, `${edge.id} has a diagonal segment`);
        for (const node of nodes) {
          if (node.id === edge.from || node.id === edge.to) continue;
          assert.ok(!segmentHitsRect(p, q, node), `${edge.id} crosses ${node.id}`);
        }
      }
    }
  });

  test(`[${stage}] edges start at the parent's bottom edge and end at the child's top edge`, () => {
    const { nodes, edges } = layoutFor(isVisible);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      const start = edge.points[0];
      const end = edge.points.at(-1);
      assert.equal(start.y, from.y + from.height);
      assert.ok(start.x > from.x && start.x < from.x + from.width);
      assert.equal(end.y, to.y);
      assert.ok(end.x > to.x && end.x < to.x + to.width);
    }
  });

  test(`[${stage}] all coordinates are >= 0`, () => {
    const { nodes, edges, bounds } = layoutFor(isVisible);
    for (const n of nodes) assert.ok(n.x >= 0 && n.y >= 0, n.id);
    for (const e of edges) for (const p of e.points) assert.ok(p.x >= 0 && p.y >= 0, e.id);
    assert.equal(bounds.minX, 0);
    assert.equal(bounds.minY, 0);
    for (const n of nodes) {
      assert.ok(n.x + n.width <= bounds.maxX && n.y + n.height <= bounds.maxY, n.id);
    }
  });

  test(`[${stage}] layout is deterministic, regardless of input order`, () => {
    const a = layoutFor(isVisible);
    const b = layoutGraph([...PRESTIGE_NODES].reverse(), { isVisible, nodeSize, gap });
    assert.deepEqual(b, a);
  });
}

test('rows follow the longest path from a root', () => {
  const { nodes } = layoutFor(() => true);
  const row = Object.fromEntries(nodes.map((n) => [n.id, n.row]));
  assert.equal(row['unlock-triangle'], 0);
  assert.equal(row['unlock-square'], 1);
  assert.equal(row['triangle-value'], 2);
  assert.equal(row['speed-collision-value'], 4);
  assert.equal(row['mass-collision-value'], 5);
});

test('every requirement between visible nodes becomes an edge', () => {
  const { edges } = layoutFor(() => true);
  const expected = PRESTIGE_NODES.flatMap((n) => reqIds(n).map((r) => `${r}->${n.id}`)).sort();
  assert.deepEqual(edges.map((e) => e.id).sort(), expected);
});

test('an edge that skips rows routes around the nodes in between', () => {
  const nodes = [
    { id: 'a', requires: [] },
    { id: 'b', requires: ['a'] },
    { id: 'c', requires: ['b'] },
    { id: 'd', requires: ['a', 'c'] }, // a → d spans three rows
    { id: 'e', requires: ['a'] },
  ];
  const layout = layoutGraph(nodes, { nodeSize, gap });
  const skip = layout.edges.find((e) => e.id === 'a->d');
  for (let i = 0; i < skip.points.length - 1; i++) {
    for (const node of layout.nodes) {
      if (node.id === 'a' || node.id === 'd') continue;
      assert.ok(!segmentHitsRect(skip.points[i], skip.points[i + 1], node), `crosses ${node.id}`);
    }
  }
});

test('a pinned node keeps its row and column order', () => {
  const nodes = [
    { id: 'root', requires: [] },
    { id: 'x', requires: ['root'] },
    { id: 'y', requires: ['root'] },
    { id: 'z', requires: ['root'], pin: { col: 0, row: 2 } },
  ];
  const layout = layoutGraph(nodes, { nodeSize, gap });
  const z = layout.nodes.find((n) => n.id === 'z');
  assert.equal(z.row, 2);

  const pinnedFirst = layoutGraph(
    [...nodes.slice(0, 3), { id: 'w', requires: ['root'], pin: { col: 0, row: 1 } }],
    { nodeSize, gap },
  );
  const row1 = pinnedFirst.nodes.filter((n) => n.row === 1).sort((a, b) => a.x - b.x);
  assert.equal(row1[0].id, 'w');
});

test('cycles are reported and do not hang the layout', () => {
  const warnings = [];
  const nodes = [
    { id: 'a', requires: ['c'] },
    { id: 'b', requires: ['a'] },
    { id: 'c', requires: ['b'] },
  ];
  const layout = layoutGraph(nodes, { nodeSize, gap, warn: (msg) => warnings.push(msg) });
  assert.equal(layout.nodes.length, 3);
  assert.ok(warnings.some((w) => /cycle/i.test(w)));
});

test('existing nodes keep their left-to-right order when a node appears', () => {
  const before = layoutFor(stages['after Unlock Square']);
  const after = layoutGraph(PRESTIGE_NODES, {
    isVisible: (n) => stages['after Unlock Square'](n) || n.id === 'click-value',
    nodeSize,
    gap,
    previous: before,
  });
  const order = (layout, ids) =>
    layout.nodes.filter((n) => ids.includes(n.id)).sort((a, b) => a.x - b.x).map((n) => n.id);
  for (const row of [0, 1, 2]) {
    const ids = before.nodes.filter((n) => n.row === row).map((n) => n.id);
    assert.deepEqual(order(after, ids), order(before, ids), `row ${row} reordered`);
  }
});
