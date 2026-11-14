import assert from 'node:assert/strict';
import test from 'node:test';
import CircleBoard from '../src/circleboard/CircleBoard.js';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';

const fakeCanvas = { getContext: () => ({ setTransform() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, closePath() {} }), width: 0, height: 0 };

const makeBoard = () => {
  const board = new CircleBoard(fakeCanvas);
  board.container = { x: 400, y: 400, radius: 380, thickness: 5 };
  board.scaleFactor = 1;
  board.render = () => {};
  return board;
};

const add = (board, shape) => {
  shape.id = board.counter++;
  board.shapes.push(shape);
  return shape;
};

const speedOf = (shape) => Math.hypot(shape.velocity.x, shape.velocity.y);

test('a collision changes direction but never moves speed from one shape to another', () => {
  const board = makeBoard();
  // A fast, heavy square slams into a slow one head-on.
  const fast = add(board, Square.create(395, 400, 10, 0, 'red', 8, 0, 10));
  fast.mass *= 10;
  const slow = add(board, Square.create(404, 400, 10, 0, 'blue', -1, 0, 10));
  board.updatePhysics({});
  assert.ok(Math.abs(speedOf(fast) - 8) < 1e-9, `fast kept its speed (${speedOf(fast)})`);
  assert.ok(Math.abs(speedOf(slow) - 1) < 1e-9, `slow kept its speed (${speedOf(slow)})`);
});

test('Supercharge only speeds up the struck shape, even after it hits others', () => {
  const board = makeBoard();
  board.lightningChance = 1;
  board.lightningChargeBonus = 0.5;
  // Source circle hits the wall this frame; lightning picks the other circle.
  const source = add(board, Circle.create(400 + 368, 400, 10, 'a', 2, 0, 10));
  const struck = add(board, Circle.create(300, 400, 10, 'b', 2, 0, 10));
  const rolls = [0, 0.75]; // strike, then pick index 1
  board.lightningRng = () => rolls.shift() ?? 0.99;
  board.updatePhysics({});
  assert.ok(struck.cruiseSpeed > 2.9, 'struck shape got faster');

  // Now the charged shape collides with a bystander: the bystander stays at its own speed.
  board.lightningChance = 0;
  const bystander = add(board, Circle.create(struck.center.x + 15, struck.center.y, 10, 'c', -1, 0, 10));
  board.updatePhysics({});
  assert.ok(Math.abs(speedOf(bystander) - 1) < 1e-9, `bystander kept its speed (${speedOf(bystander)})`);
  assert.ok(Math.abs(speedOf(source) - 2) < 1e-9, 'the source was not charged');
});

test('permanent speed upgrades only apply to shapes bought after them', () => {
  const board = makeBoard();
  const old = add(board, Circle.create(200, 400, 10, 'a', 1, 0, 10));
  board.updatePhysics({}, { spawnSpeed: { circle: 1 } });
  const fresh = add(board, Circle.create(600, 400, 10, 'b', 1, 0, 10));
  const oldX = old.center.x;
  const freshX = fresh.center.x;
  board.updatePhysics({}, { spawnSpeed: { circle: 2 } });
  assert.equal(old.speedMultiplier, 1);
  assert.equal(fresh.speedMultiplier, 2);
  assert.ok(Math.abs(old.center.x - oldX - 1) < 1e-9, 'old shape moves at its old speed');
  assert.ok(Math.abs(fresh.center.x - freshX - 2) < 1e-9, 'new shape gets the upgrade');
});

test('temporary boosts still speed up every shape', () => {
  const board = makeBoard();
  const shape = add(board, Circle.create(200, 400, 10, 'a', 1, 0, 10));
  const x = shape.center.x;
  board.updatePhysics({ circle: 3 }, { spawnSpeed: { circle: 1 } });
  assert.ok(Math.abs(shape.center.x - x - 3) < 1e-9);
});

test('a fused shape keeps the better speed multiplier of its parents', () => {
  const board = makeBoard();
  board.fusionChance = 1;
  board.fusionRng = () => 0;
  const a = add(board, Circle.create(400, 400, 10, 'a', 1, 0, 10));
  const b = add(board, Circle.create(405, 400, 10, 'b', 1, 0, 10));
  a.speedMultiplier = 1.5;
  b.speedMultiplier = 1.2;
  board.updatePhysics({}, { spawnSpeed: { circle: 3 } });
  assert.equal(board.shapes.length, 1);
  assert.equal(board.shapes[0].speedMultiplier, 1.5);
});

test('Decrease Large Circle Size only makes shapes bought afterwards bigger', () => {
  const board = makeBoard();
  board.calculateScaleFactor();
  board.initContainer();
  const before = add(board, board.createBall());
  const radius = before.radius;
  const velocity = { ...before.velocity };
  board.setReferenceSize(500);
  assert.equal(before.radius, radius, 'existing shape keeps its size');
  assert.deepEqual(before.velocity, velocity, 'existing shape keeps its speed');
  assert.ok(Math.abs(before.baseRadius * board.scaleFactor - radius) < 1e-9, 'base size stays in sync');
});
