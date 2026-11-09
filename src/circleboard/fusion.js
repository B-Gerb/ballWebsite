import Circle from './circle.js';
import Square from './square.js';
import Triangle from './triangle.js';

/**
 * Fusion skill: two shapes of the same type merge into one.
 *
 *   fuseShapes(a, b, { scaleFactor, maxBaseSize, maxSpeed }) -> shape | null
 *
 * - Size: areas add up (base size = √(a² + b²)), so the board never gains area.
 * - Speed: the speeds add up (capped at `maxSpeed`) along the direction of the
 *   combined momentum.
 * - Value: `value` (how many points each hit is worth, default 1) adds up, so
 *   fewer shapes earn at least as much, and the faster shape hits walls more.
 * - Position: the centre of mass of the two.
 *
 * Returns null (no fusion) when the types differ or the result would be
 * bigger than `maxBaseSize` (in base, unscaled units).
 */
export function fuseShapes(a, b, { scaleFactor = 1, maxBaseSize = Infinity, maxSpeed = Infinity } = {}) {
  if (a.getName() !== b.getName()) return null;

  const baseA = a instanceof Circle ? a.baseRadius : a.baseSide;
  const baseB = b instanceof Circle ? b.baseRadius : b.baseSide;
  const base = Math.hypot(baseA, baseB);
  if (!(base <= maxBaseSize)) return null;

  const totalMass = a.mass + b.mass;
  const wa = a.mass / totalMass;
  const wb = b.mass / totalMass;
  const x = a.center.x * wa + b.center.x * wb;
  const y = a.center.y * wa + b.center.y * wb;

  const speed = Math.min(
    Math.hypot(a.velocity.x, a.velocity.y) + Math.hypot(b.velocity.x, b.velocity.y),
    maxSpeed,
  );
  let dirX = a.velocity.x * a.mass + b.velocity.x * b.mass;
  let dirY = a.velocity.y * a.mass + b.velocity.y * b.mass;
  let len = Math.hypot(dirX, dirY);
  if (len === 0) {
    dirX = a.velocity.x;
    dirY = a.velocity.y;
    len = Math.hypot(dirX, dirY);
  }
  const vx = len === 0 ? 0 : (dirX / len) * speed;
  const vy = len === 0 ? 0 : (dirY / len) * speed;

  const heavier = a.mass >= b.mass ? a : b;
  const size = base * scaleFactor;
  let fused;
  if (a instanceof Circle) {
    fused = Circle.create(x, y, size, heavier.color, vx, vy, base);
  } else if (a instanceof Square) {
    fused = Square.create(x, y, size, heavier.rotation, heavier.color, vx, vy, base);
  } else if (a instanceof Triangle) {
    fused = Triangle.create(x, y, size, heavier.rotation, heavier.color, vx, vy, base);
  } else {
    return null;
  }
  fused.value = (a.value ?? 1) + (b.value ?? 1);
  return fused;
}
