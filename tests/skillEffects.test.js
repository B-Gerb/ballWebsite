import assert from 'node:assert/strict';
import test from 'node:test';
import CircleBoard from '../src/circleboard/CircleBoard.js';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';
import Triangle from '../src/circleboard/triangle.js';
import { MAX_MASS_BONUS, PROMOTION_VALUE_BONUS, applyMassBonus, fuseShapes } from '../src/circleboard/fusion.js';

const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: ${actual} vs ${expected}`);
const speedOf = (s) => Math.hypot(s.velocity.x, s.velocity.y);
const fakeCanvas = { getContext: () => ({}) };

const makeBoard = (effects = {}) => {
  const board = new CircleBoard(fakeCanvas);
  board.container = { x: 400, y: 400, radius: 380, thickness: 5 };
  board.scaleFactor = 1;
  board.setSkillEffects(effects);
  return board;
};
const add = (board, shape) => {
  shape.id = board.counter++;
  board.shapes.push(shape);
  return shape;
};

/* ── Fusion: Ascension, Momentum ─────────────────────────────────── */

test('an upgraded fusion becomes the next shape with the same total area and 1.5× value', () => {
  const a = Circle.create(0, 0, 3, 'red', 1, 0, 3);
  const b = Circle.create(5, 0, 4, 'red', 1, 0, 4);
  const tri = fuseShapes(a, b, { promoteTo: 'Triangle' });
  assert.ok(tri instanceof Triangle);
  close((Math.sqrt(3) / 4) * tri.baseSide ** 2, Math.PI * 25, 'area kept');
  assert.equal(tri.value, 2 * PROMOTION_VALUE_BONUS);

  const sq = fuseShapes(tri, Triangle.create(0, 0, 5, 0, 'red', 1, 0, 5), { promoteTo: 'Square' });
  assert.ok(sq instanceof Square);
});

test('the board upgrades circle → triangle → square, and squares just fuse', () => {
  const board = makeBoard({ fusionChance: 1, fusionPromoteChance: 1 });
  board.fusionRng = () => 0;
  add(board, Circle.create(400, 400, 10, 'red', 1, 0, 10));
  add(board, Circle.create(405, 400, 10, 'red', -1, 0, 10));
  board.updatePhysics({});
  assert.equal(board.shapes.length, 1);
  assert.equal(board.shapes[0].getName(), 'Triangle');

  const squares = makeBoard({ fusionChance: 1, fusionPromoteChance: 1 });
  squares.fusionRng = () => 0;
  add(squares, Square.create(400, 400, 10, 0, 'red', 1, 0, 10));
  add(squares, Square.create(405, 400, 10, 0, 'red', -1, 0, 10));
  squares.updatePhysics({});
  assert.equal(squares.shapes[0].getName(), 'Square');
});

test('Momentum makes fused shapes faster and heavier', () => {
  const a = Circle.create(0, 0, 3, 'red', 3, 0, 3);
  const b = Circle.create(5, 0, 3, 'red', 0, 4, 3);
  const plain = fuseShapes(a, b);
  const boosted = fuseShapes(a, b, { speedBonus: 0.5, massBonus: 0.5 });
  close(speedOf(boosted), speedOf(plain) * 1.5, 'speed');
  close(boosted.mass, plain.mass * 1.5, 'mass');
  assert.equal(boosted.massBonus, 1.5);
});

test('weight bonuses are capped', () => {
  const shape = Circle.create(0, 0, 3, 'red', 1, 0, 3);
  const base = shape.mass;
  applyMassBonus(shape, 1000);
  assert.equal(shape.massBonus, MAX_MASS_BONUS);
  close(shape.mass, base * MAX_MASS_BONUS, 'mass');
});

/* ── Chain lightning ─────────────────────────────────────────────── */

test('a scoring hit can strike another shape, which earns its own value', () => {
  const board = makeBoard({ lightningChance: 1 });
  board.lightningRng = () => 0.99; // strike succeeds (<1), target = last shape, no chain
  add(board, Circle.create(770, 400, 10, 'red', 1, 0, 10)); // hits the wall
  const target = add(board, Square.create(200, 400, 10, 0, 'blue', 0, 0, 10));
  target.value = 4;

  const stats = board.updatePhysics({});
  assert.equal(stats.total.lightningStrikes, 1);
  assert.equal(stats.Square.collisionValue, 4, 'struck square earns as if it collided');
  assert.equal(board.lightningFlashes.length, 1);
});

test('no lightning without the skill', () => {
  const board = makeBoard();
  add(board, Circle.create(770, 400, 10, 'red', 1, 0, 10));
  add(board, Square.create(200, 400, 10, 0, 'blue', 0, 0, 10));
  assert.equal(board.updatePhysics({}).total.lightningStrikes, 0);
});

test('Forked Bolt lets strikes chain, up to a limit', () => {
  const board = makeBoard({ lightningChance: 1, lightningChainChance: 1 });
  let i = 0;
  board.lightningRng = () => [0.1, 0.5, 0.9][i++ % 3]; // varied targets, every chain roll succeeds
  add(board, Circle.create(770, 400, 10, 'red', 1, 0, 10));
  add(board, Circle.create(200, 400, 10, 'red', 0, 0.001, 10));
  add(board, Circle.create(300, 400, 10, 'red', 0, 0.001, 10));
  const stats = board.updatePhysics({});
  assert.ok(stats.total.lightningStrikes > 1);
  assert.ok(stats.total.lightningStrikes <= 12);
});

test('Supercharge permanently speeds up and weighs down struck shapes', () => {
  const board = makeBoard({ lightningChance: 1, lightningChargeBonus: 0.1 });
  board.lightningRng = () => 0.99;
  add(board, Circle.create(770, 400, 10, 'red', 1, 0, 10));
  const target = add(board, Circle.create(200, 400, 10, 'red', 2, 0, 10));
  const mass = target.mass;
  board.updatePhysics({});
  close(target.velocity.x, 2.2, 'speed +10%');
  close(target.mass, mass * 1.1, 'weight +10%');
});
