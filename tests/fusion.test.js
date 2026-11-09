import assert from 'node:assert/strict';
import test from 'node:test';
import Circle from '../src/circleboard/circle.js';
import Square from '../src/circleboard/square.js';
import Triangle from '../src/circleboard/triangle.js';
import { fuseShapes } from '../src/circleboard/fusion.js';

const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: ${actual} vs ${expected}`);
const speedOf = (s) => Math.hypot(s.velocity.x, s.velocity.y);

test('two circles fuse into one whose area is the sum of both', () => {
  // radius 3 and 4 (base units) -> radius 5, at scale 2 -> drawn radius 10
  const a = Circle.create(0, 0, 6, 'red', 1, 0, 3);
  const b = Circle.create(10, 0, 8, 'blue', 0, 2, 4);
  const fused = fuseShapes(a, b, { scaleFactor: 2, maxBaseSize: 100, maxSpeed: 100 });
  assert.ok(fused instanceof Circle);
  close(fused.baseRadius, 5, 'base radius');
  close(fused.radius, 10, 'radius');
  close(fused.mass, Math.PI * 100, 'mass');
});

test('the fused shape moves at the combined speed of both, up to a cap', () => {
  const a = Circle.create(0, 0, 3, 'red', 3, 0, 3);
  const b = Circle.create(5, 0, 3, 'red', 0, 4, 3);
  const fused = fuseShapes(a, b, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 100 });
  close(speedOf(fused), 7, 'speed is 3 + 4');

  const capped = fuseShapes(a, b, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 5 });
  close(speedOf(capped), 5, 'speed is capped');
});

test('fused shapes are worth the value of both parts', () => {
  const a = Square.create(0, 0, 3, 0, 'red', 1, 0, 3);
  const b = Square.create(5, 0, 4, 0, 'red', 1, 0, 4);
  b.value = 3;
  const fused = fuseShapes(a, b, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 100 });
  assert.ok(fused instanceof Square);
  assert.equal(fused.value, 4);
  close(fused.baseSide, 5, 'side');
});

test('triangles fuse into a triangle with a consistent mass', () => {
  const a = Triangle.create(0, 0, 3, 0, 'red', 1, 0, 3);
  const b = Triangle.create(5, 0, 4, 0, 'red', 1, 0, 4);
  const fused = fuseShapes(a, b, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 100 });
  assert.ok(fused instanceof Triangle);
  close(fused.side, 5, 'side');
  close(fused.mass, (Math.sqrt(3) / 4) * 25, 'mass');
});

test('the fused shape appears between the two, nearer the heavier one', () => {
  const a = Circle.create(0, 0, 1, 'red', 1, 0, 1);
  const b = Circle.create(10, 0, 3, 'red', 1, 0, 3);
  const fused = fuseShapes(a, b, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 100 });
  close(fused.center.x, 9, 'mass-weighted x'); // masses 1 : 9
  close(fused.center.y, 0, 'y');
});

test('shapes refuse to fuse across types or past the size cap', () => {
  const circle = Circle.create(0, 0, 3, 'red', 1, 0, 3);
  const square = Square.create(0, 0, 3, 0, 'red', 1, 0, 3);
  assert.equal(fuseShapes(circle, square, { scaleFactor: 1, maxBaseSize: 100, maxSpeed: 100 }), null);

  const big = Circle.create(0, 0, 4, 'red', 1, 0, 4);
  assert.equal(fuseShapes(circle, big, { scaleFactor: 1, maxBaseSize: 4.9, maxSpeed: 100 }), null);
});
