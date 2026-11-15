import assert from 'node:assert/strict';
import test from 'node:test';
import seedrandom from 'seedrandom';
import CircleBoard from '../src/circleboard/CircleBoard.js';
import CollisionResponse from '../src/circleboard/CollisionResponse.js';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';
import Triangle from '../src/circleboard/triangle.js';
import { geometryOf } from '../src/circleboard/collisionGeometry.js';
import { SpatialGrid, gridSizeFor, GRID_LIMITS } from '../src/circleboard/spatialGrid.js';

/** The original SAT, straight from the shapes' own axes()/projection(). */
function referenceMTV(shapeA, shapeB) {
  const axes = [...shapeA.axes(shapeB), ...shapeB.axes(shapeA)];
  let minOverlap = Infinity;
  let mtvAxis = null;
  for (const axis of axes) {
    const projA = shapeA.projection(axis);
    const projB = shapeB.projection(axis);
    if (!(projA[1] > projB[0] && projB[1] > projA[0])) return null;
    const overlap = Math.min(projA[1] - projB[0], projB[1] - projA[0]);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      mtvAxis = axis;
    }
  }
  if (!mtvAxis) return null;
  const dot = (shapeB.center.x - shapeA.center.x) * mtvAxis.x + (shapeB.center.y - shapeA.center.y) * mtvAxis.y;
  if (dot < 0) mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
  return { normal: mtvAxis, magnitude: minOverlap };
}

/** Random shapes centred in a 740x740 box (inside BOUNDS, edges poking out); `bigShare` of them 60-160 units across. */
function randomShapes(seed, count, { bigShare = 0.05, spread = 740 } = {}) {
  const rng = seedrandom(seed);
  const shapes = [];
  for (let i = 0; i < count; i++) {
    const big = rng() < bigShare;
    const size = big ? 30 + rng() * 50 : 3 + rng() * 14;
    const x = 400 + (rng() - 0.5) * spread;
    const y = 400 + (rng() - 0.5) * spread;
    const rot = rng() * 360;
    const kind = Math.floor(rng() * 3);
    const shape = kind === 0 ? Circle.create(x, y, size, 'red', 1, 0)
      : kind === 1 ? Square.create(x, y, size * 2, rot, 'red', 1, 0)
        : Triangle.create(x, y, size * 2, rot, 'red', 1, 0);
    shape.id = i;
    shapes.push(shape);
  }
  return shapes;
}

const BOUNDS = { x: 25, y: 25, width: 750, height: 750 };

/** Every pair the grid hands out (owner cell only), as "a-b" with a < b. */
function gridPairs(shapes, size) {
  const grid = new SpatialGrid().build(shapes, BOUNDS, size);
  const pairs = [];
  for (let cell = 0; cell < grid.size * grid.size; cell++) {
    for (let j = grid.start[cell]; j < grid.start[cell + 1]; j++) {
      for (let k = j + 1; k < grid.start[cell + 1]; k++) {
        const a = grid.items[j], b = grid.items[k];
        if (grid.ownerCell(a, b) === cell) pairs.push(a < b ? `${a}-${b}` : `${b}-${a}`);
      }
    }
  }
  return pairs;
}

test('findMTV gives exactly the same answer as the original SAT', () => {
  // Dense random pairs: far apart, near misses, touching and overlapping.
  const shapes = randomShapes('mtv', 400, { bigShare: 0.1, spread: 160 });
  let hits = 0;
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const expected = referenceMTV(shapes[i], shapes[j]);
      const actual = CollisionResponse.findMTV(shapes[i], shapes[j]);
      if (expected === null) {
        assert.equal(actual, null, `pair ${i}-${j}`);
      } else {
        hits++;
        assert.deepEqual(actual, expected, `pair ${i}-${j}`);
      }
    }
  }
  assert.ok(hits > 1000, `test should cover many overlaps (got ${hits})`);
});

test('cached geometry follows moves, resizes and matches getVertices exactly', () => {
  for (const shape of [Square.create(100, 100, 20, 33, 'red', 0, 0), Triangle.create(100, 100, 20, 71, 'red', 0, 0)]) {
    const check = () => {
      const verts = geometryOf(shape).verts;
      assert.deepEqual([...verts], shape.getVertices().flatMap((v) => [v.x, v.y]));
    };
    check();
    shape.center.x += 3.7;
    shape.center.y -= 1.1;
    check();
    shape.side = 45;
    check();
    assert.ok(geometryOf(shape).R >= 45 / Math.sqrt(3) - 1e-9);
  }
  const circle = Circle.create(0, 0, 5, 'red', 0, 0);
  assert.equal(geometryOf(circle).R, 5);
  circle.radius = 9;
  assert.equal(geometryOf(circle).R, 9);
});

test('the grid finds every overlapping pair a brute-force check finds, each exactly once', () => {
  for (const [seed, count, bigShare] of [['a', 300, 0], ['b', 400, 0.05], ['c', 150, 0.4]]) {
    const shapes = randomShapes(seed, count, { bigShare });
    const expected = new Set();
    for (let i = 0; i < shapes.length; i++) {
      for (let j = i + 1; j < shapes.length; j++) {
        if (referenceMTV(shapes[i], shapes[j])) expected.add(`${i}-${j}`);
      }
    }
    assert.ok(expected.size > 20, 'test should have overlaps');
    for (const size of [1, 2, 6, 17, 31, 64, null]) {
      const pairs = gridPairs(shapes, size);
      const unique = new Set(pairs);
      assert.equal(unique.size, pairs.length, `no pair twice (seed ${seed}, size ${size})`);
      for (const pair of expected) assert.ok(unique.has(pair), `missing ${pair} (seed ${seed}, size ${size})`);
    }
  }
});

test('a huge shape covering most of the grid still meets every small shape it overlaps', () => {
  const big = Square.create(400, 400, 600, 10, 'red', 0, 0);
  big.id = 0;
  const shapes = [big, ...randomShapes('small', 200, { bigShare: 0 })];
  shapes.forEach((shape, i) => { shape.id = i; });
  const pairs = new Set(gridPairs(shapes, 48));
  let overlapping = 0;
  for (let i = 1; i < shapes.length; i++) {
    if (referenceMTV(big, shapes[i])) {
      overlapping++;
      assert.ok(pairs.has(`0-${i}`), `big shape vs ${i}`);
    }
  }
  assert.ok(overlapping > 50);
});

test('shapes poking outside the grid bounds are clamped into the edge cells', () => {
  const a = Circle.create(10, 10, 20, 'red', 0, 0);
  const b = Circle.create(12, 8, 20, 'red', 0, 0);
  const c = Circle.create(NaN, 8, 20, 'red', 0, 0);
  const d = Circle.create(-100, 8, 20, 'red', 0, 0); // entirely outside: no cell
  assert.deepEqual(gridPairs([a, b, c, d], 10), ['0-1']);
});

test('grid size follows the average shape size, within limits', () => {
  assert.equal(gridSizeFor(8, 750), 31);
  assert.equal(gridSizeFor(1000, 750), GRID_LIMITS.min);
  assert.equal(gridSizeFor(0.01, 750), GRID_LIMITS.max);
  assert.equal(gridSizeFor(NaN, 750), GRID_LIMITS.min);
});

test('updatePhysics counts each touching pair once per step, big shapes included', () => {
  const board = new CircleBoard({ getContext: () => ({}) });
  board.container = { x: 400, y: 400, radius: 375, thickness: 5 };
  // Isolated touching pairs, so one bounce cannot cause another, plus a big
  // square spanning many cells touching a small circle, and lone shapes.
  const shapes = [
    Circle.create(200, 400, 10, 'red', 1, 0), Circle.create(215, 400, 10, 'red', -1, 0),
    Square.create(400, 200, 20, 0, 'red', 0, 1), Square.create(400, 215, 20, 45, 'red', 0, -1),
    Triangle.create(600, 400, 20, 0, 'red', 0, 0), Circle.create(600, 412, 8, 'red', 0, -1),
    Square.create(400, 480, 150, 20, 'red', 0, 0), Circle.create(400, 560, 10, 'red', 0, -1),
    Circle.create(150, 250, 5, 'red', 1, 1), Triangle.create(650, 600, 10, 0, 'red', 1, 1),
  ];
  shapes.forEach((shape) => { shape.id = board.counter++; board.shapes.push(shape); });
  const stats = board.updatePhysics({});
  assert.equal(stats.total.totalShapeCollisions, 4);
  assert.equal(stats.total.totalWallHits, 0);
  assert.ok(stats.total.maxImpactSpeed > 0);
});

test('a packed board stays inside the arena and keeps colliding', () => {
  const board = new CircleBoard({ getContext: () => ({}) });
  board.container = { x: 400, y: 400, radius: 375, thickness: 5 };
  board.scaleFactor = 1.0667;
  const rng = seedrandom('packed');
  board.rng = rng;
  board.addNewBalls(400);
  board.addNewSquares(400);
  board.addNewTriangles(400);
  // Substeps as Server.js runs them for this many shapes (8, each 1/8 speed).
  let collisions = 0;
  const perStep = { circle: 1 / 8, square: 1 / 8, triangle: 1 / 8 };
  for (let step = 0; step < 30 * 8; step++) {
    collisions += board.updatePhysics(perStep, { substeps: 8 }).total.totalShapeCollisions;
  }
  assert.ok(collisions > 1000);
  for (const shape of board.shapes) {
    const d = Math.hypot(shape.center.x - 400, shape.center.y - 400);
    assert.ok(d < 375, `shape ${shape.id} escaped (${d})`);
  }
});
