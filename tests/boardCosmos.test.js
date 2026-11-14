import assert from 'node:assert/strict';
import test from 'node:test';
import CircleBoard from '../src/circleboard/CircleBoard.js';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';

const fakeCanvas = { getContext: () => ({}) };

const makeBoard = () => {
  const board = new CircleBoard(fakeCanvas);
  board.container = { x: 400, y: 400, radius: 380, thickness: 5 };
  board.scaleFactor = 1;
  return board;
};

const add = (board, shape) => {
  shape.id = board.counter++;
  board.shapes.push(shape);
  return shape;
};

test('total mass adds up every shape on the board', () => {
  const board = makeBoard();
  const a = add(board, Circle.create(200, 400, 10, 'a', 1, 0, 10));
  const b = add(board, Square.create(600, 400, 10, 0, 'b', 1, 0, 10));
  assert.ok(Math.abs(board.getTotalMass() - (a.mass + b.mass)) < 1e-9);
});

test('a frame reports its fastest collision, at the speed shapes really move', () => {
  const board = makeBoard();
  // Head-on: 4 + 6 = 10 units per frame relative speed.
  add(board, Circle.create(395, 400, 10, 'a', 4, 0, 10));
  add(board, Circle.create(410, 400, 10, 'b', -6, 0, 10));
  const plain = board.updatePhysics({});
  assert.ok(Math.abs(plain.total.maxImpactSpeed - 10) < 1e-9, `got ${plain.total.maxImpactSpeed}`);

  const boosted = makeBoard();
  add(boosted, Circle.create(395, 400, 10, 'a', 4, 0, 10));
  add(boosted, Circle.create(410, 400, 10, 'b', -6, 0, 10));
  // A ×3 boost split into 2 substeps (×1.5 each) still means ×3 per frame,
  // and each shape's own ×2 permanent multiplier counts too.
  const stats = boosted.updatePhysics({ circle: 1.5 }, { spawnSpeed: { circle: 2 }, substeps: 2 });
  assert.ok(Math.abs(stats.total.maxImpactSpeed - 60) < 1e-9, `got ${stats.total.maxImpactSpeed}`);
});

test('no collision means no impact speed', () => {
  const board = makeBoard();
  add(board, Circle.create(200, 400, 10, 'a', 4, 0, 10));
  assert.equal(board.updatePhysics({}).total.maxImpactSpeed, 0);
});

test('shapes bought after a black hole lock in the lighter spawn mass; older shapes keep theirs', () => {
  const board = makeBoard();
  const old = add(board, Circle.create(200, 400, 10, 'a', 1, 0, 10));
  board.updatePhysics({}, { spawnMass: 1 });
  const oldMass = old.mass;
  const fresh = add(board, Circle.create(600, 400, 10, 'b', 1, 0, 10));
  const rawMass = fresh.mass;
  board.updatePhysics({}, { spawnMass: 0.1 });
  assert.equal(old.mass, oldMass);
  assert.ok(Math.abs(fresh.mass - rawMass * 0.1) < 1e-9);
  assert.equal(fresh.massScale, 0.1);
  assert.equal(fresh.getInformation().massScale, 0.1, 'saved with the shape');
});

test('clearing the board removes every shape and lightning bolt', () => {
  const board = makeBoard();
  add(board, Circle.create(200, 400, 10, 'a', 1, 0, 10));
  board.lightningFlashes.push({ points: [], life: 3 });
  board.clearShapes('blackHole');
  assert.equal(board.shapes.length, 0);
  assert.equal(board.lightningFlashes.length, 0);
  assert.equal(board.cosmicFlash?.kind, 'blackHole');
});
