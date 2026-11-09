import assert from 'node:assert/strict';
import test from 'node:test';
import CircleBoard from '../src/circleboard/CircleBoard.js';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';

const fakeCanvas = { getContext: () => ({}) };

const makeBoard = ({ fusionChance = 1, roll = 0 } = {}) => {
  const board = new CircleBoard(fakeCanvas);
  board.container = { x: 400, y: 400, radius: 380, thickness: 5 };
  board.scaleFactor = 1;
  board.fusionRng = () => roll;
  board.fusionChance = fusionChance;
  return board;
};

const add = (board, shape) => {
  shape.id = board.counter++;
  board.shapes.push(shape);
  return shape;
};

const circleAt = (x, y = 400) => Circle.create(x, y, 10, 'red', 1, 0, 10);

test('two colliding shapes of the same type fuse when the roll succeeds', () => {
  const board = makeBoard();
  add(board, circleAt(400));
  add(board, circleAt(405));
  const stats = board.updatePhysics({});
  assert.equal(board.shapes.length, 1);
  assert.equal(board.shapes[0].value, 2);
  assert.equal(stats.total.fusions, 1);
  assert.equal(stats.total.totalShapeCollisions, 1, 'the collision itself still counts');
});

test('fused shapes get a fresh id that no other shape uses', () => {
  const board = makeBoard();
  add(board, circleAt(400));
  add(board, circleAt(405));
  const other = add(board, circleAt(200));
  board.updatePhysics({});
  const ids = board.shapes.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(other.id));
});

test('nothing fuses without the skill or when the roll fails', () => {
  const noSkill = makeBoard({ fusionChance: 0 });
  add(noSkill, circleAt(400));
  add(noSkill, circleAt(405));
  noSkill.updatePhysics({});
  assert.equal(noSkill.shapes.length, 2);

  const unlucky = makeBoard({ fusionChance: 0.01, roll: 0.5 });
  add(unlucky, circleAt(400));
  add(unlucky, circleAt(405));
  unlucky.updatePhysics({});
  assert.equal(unlucky.shapes.length, 2);
});

test('different shape types bounce instead of fusing', () => {
  const board = makeBoard();
  add(board, circleAt(400));
  add(board, Square.create(405, 400, 10, 0, 'red', 1, 0, 10));
  const stats = board.updatePhysics({});
  assert.equal(board.shapes.length, 2);
  assert.equal(stats.total.totalShapeCollisions, 1);
});

test('a shape fuses at most once per frame', () => {
  const board = makeBoard();
  add(board, circleAt(400));
  add(board, circleAt(404));
  add(board, circleAt(408));
  const stats = board.updatePhysics({});
  assert.equal(stats.total.fusions, 1);
  assert.equal(board.shapes.length, 2);
  assert.equal(board.shapes.reduce((sum, s) => sum + (s.value ?? 1), 0), 3, 'no value lost');
});

test('hits from a fused shape are worth its combined value', () => {
  const board = makeBoard({ fusionChance: 0 });
  const heavy = add(board, Circle.create(770, 400, 10, 'red', 1, 0, 10));
  heavy.value = 3;
  const stats = board.updatePhysics({});
  assert.equal(stats.Circle.totalWallHits, 1);
  assert.equal(stats.Circle.wallHitValue, 3);
});
