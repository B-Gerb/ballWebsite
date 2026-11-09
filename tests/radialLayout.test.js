import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutRadial } from '../src/components/whiteboard/radialLayout.js';

const SIZE = { width: 100, height: 80 };

// root ─┬─ a ── a1
//       ├─ b ─┬ b1
//       │     └ b2
//       └─ c
const TREE = [
  { id: 'root', requires: [] },
  { id: 'a', requires: ['root'] },
  { id: 'b', requires: ['root'] },
  { id: 'c', requires: ['root'] },
  { id: 'a1', requires: ['a'] },
  { id: 'b1', requires: ['b'] },
  { id: 'b2', requires: ['b'] },
];

const byId = (layout) => new Map(layout.nodes.map((n) => [n.id, n]));
const angleFrom = (center, node) => Math.atan2(node.cy - center.cy, node.cx - center.cx);
const angleDiff = (p, q) => Math.abs(Math.atan2(Math.sin(p - q), Math.cos(p - q)));

test('a single root sits at the centre and its children ring around it', () => {
  const nodes = byId(layoutRadial(TREE, { nodeSize: SIZE }));
  const root = nodes.get('root');
  const dist = (id) => Math.hypot(nodes.get(id).cx - root.cx, nodes.get(id).cy - root.cy);
  assert.ok(dist('a') > 0);
  assert.ok(Math.abs(dist('a') - dist('b')) < 1e-6);
  assert.ok(Math.abs(dist('b') - dist('c')) < 1e-6);
  assert.ok(dist('a1') > dist('a'));
});

test('each branch grows outward in its own direction', () => {
  const nodes = byId(layoutRadial(TREE, { nodeSize: SIZE }));
  const root = nodes.get('root');
  const branchOf = { a: 'a', a1: 'a', b: 'b', b1: 'b', b2: 'b', c: 'c' };
  // Every descendant is angularly closer to its own branch head than to any other head.
  for (const [id, head] of Object.entries(branchOf)) {
    const own = angleDiff(angleFrom(root, nodes.get(id)), angleFrom(root, nodes.get(head)));
    for (const other of ['a', 'b', 'c'].filter((h) => h !== head)) {
      const theirs = angleDiff(angleFrom(root, nodes.get(id)), angleFrom(root, nodes.get(other)));
      assert.ok(own < theirs, `${id} should point toward ${head}, not ${other}`);
    }
  }
});

test('no two node boxes overlap', () => {
  const many = [{ id: 'root', requires: [] }];
  for (let i = 0; i < 6; i++) {
    many.push({ id: `h${i}`, requires: ['root'] });
    for (let j = 0; j < 3; j++) many.push({ id: `h${i}-${j}`, requires: [`h${i}`] });
  }
  const { nodes } = layoutRadial(many, { nodeSize: SIZE, gap: 10 });
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const p = nodes[i];
      const q = nodes[j];
      const apart = p.x + p.width <= q.x || q.x + q.width <= p.x
        || p.y + p.height <= q.y || q.y + q.height <= p.y;
      assert.ok(apart, `${p.id} overlaps ${q.id}`);
    }
  }
});

test('hidden nodes keep their slot, so unlocking never moves the others', () => {
  const full = byId(layoutRadial(TREE, { nodeSize: SIZE }));
  const visible = new Set(['root', 'a', 'b']);
  const partial = layoutRadial(TREE, { nodeSize: SIZE, isVisible: (n) => visible.has(n.id) });
  assert.deepEqual(partial.nodes.map((n) => n.id).sort(), ['a', 'b', 'root']);
  for (const node of partial.nodes) {
    assert.equal(node.x, full.get(node.id).x);
    assert.equal(node.y, full.get(node.id).y);
  }
  // Content bounds hug what is visible; nothing sits at negative coordinates.
  const xs = partial.nodes.flatMap((n) => [n.x, n.x + n.width]);
  assert.equal(partial.bounds.minX, Math.min(...xs));
  assert.equal(partial.bounds.maxX, Math.max(...xs));
  assert.ok(Math.min(...[...full.values()].map((n) => n.x)) >= 0);
});

test('edges are drawn for every requirement between visible nodes', () => {
  const dag = [...TREE, { id: 'joint', requires: ['a1', { id: 'b1', level: 3 }] }];
  const all = layoutRadial(dag, { nodeSize: SIZE });
  const ids = all.edges.map((e) => e.id);
  assert.ok(ids.includes('a1->joint'));
  assert.ok(ids.includes('b1->joint'));
  assert.equal(all.edges.find((e) => e.id === 'b1->joint').level, 3);

  const hidden = layoutRadial(dag, { nodeSize: SIZE, isVisible: (n) => n.id !== 'b1' });
  assert.ok(!hidden.edges.some((e) => e.from === 'b1' || e.to === 'b1'));
});
