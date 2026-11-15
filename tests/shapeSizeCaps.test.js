import assert from 'node:assert/strict';
import test from 'node:test';
import CircleBoard, { SHAPE_SIZE_LIMITS } from '../src/circleboard/CircleBoard.js';
import Circle from '../src/circleboard/circle.js';

const fakeCanvas = { getContext: () => ({}) };

// The arena upgrade maxed out: everything is drawn 3.2× bigger.
const bigScaleBoard = () => {
  const board = new CircleBoard(fakeCanvas);
  board.scaleFactor = 3.2;
  board.container = { x: 400, y: 400, radius: 336, thickness: 16 };
  return board;
};

test('new shapes never spawn bigger than their share of the arena, however many size upgrades', () => {
  const board = bigScaleBoard();
  board.shapeInfo.Circle.baseMinBallSize = 200;
  board.shapeInfo.Circle.baseMaxBallSize = 300;
  board.shapeInfo.Square.baseMinSide = 200;
  board.shapeInfo.Square.baseMaxSide = 300;
  board.shapeInfo.Triangle.baseMinSide = 200;
  board.shapeInfo.Triangle.baseMaxSide = 300;
  const r = board.container.radius;
  for (let i = 0; i < 20; i++) {
    const ball = board.createBall();
    assert.ok(ball.radius <= SHAPE_SIZE_LIMITS.spawn.Circle * r + 1e-9, `circle radius ${ball.radius}`);
    assert.ok(Math.abs(ball.baseRadius * board.scaleFactor - ball.radius) < 1e-9, 'base size matches');
    const square = board.createSquare();
    assert.ok(square.side <= SHAPE_SIZE_LIMITS.spawn.Square * r + 1e-9, `square side ${square.side}`);
    const triangle = board.createTriangle();
    assert.ok(triangle.side <= SHAPE_SIZE_LIMITS.spawn.Triangle * r + 1e-9, `triangle side ${triangle.side}`);
  }
});

test('small shapes are not affected by the cap', () => {
  const board = new CircleBoard(fakeCanvas);
  board.scaleFactor = 1;
  board.container = { x: 400, y: 400, radius: 375, thickness: 5 };
  const ball = board.createBall();
  assert.ok(ball.baseRadius >= 5 && ball.baseRadius <= 15);
});

test('fusion stops once the fused shape would outgrow its share of the arena', () => {
  const board = bigScaleBoard();
  const cap = SHAPE_SIZE_LIMITS.fusion.Circle * board.container.radius; // on-screen radius
  // Two circles whose combined area is just over the cap: no fusion.
  const r = (cap / Math.SQRT2) * 1.01;
  const a = Circle.create(400, 400, r, 'a', 1, 0, r / board.scaleFactor);
  const b = Circle.create(410, 400, r, 'b', -1, 0, r / board.scaleFactor);
  assert.equal(board.fuse(a, b), null);
  // Just under: fuses, and stays within the cap.
  const r2 = (cap / Math.SQRT2) * 0.99;
  const fused = board.fuse(
    Circle.create(400, 400, r2, 'a', 1, 0, r2 / board.scaleFactor),
    Circle.create(410, 400, r2, 'b', -1, 0, r2 / board.scaleFactor),
  );
  assert.ok(fused && fused.radius <= cap + 1e-9);
});
