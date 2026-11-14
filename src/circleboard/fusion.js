import Circle from './circle.js';
import Square from './square.js';
import Triangle from './triangle.js';

/** Highest weight multiplier a shape can build up from skills. */
export const MAX_MASS_BONUS = 10;
/** Value multiplier for a fusion that upgrades into the next shape. */
export const PROMOTION_VALUE_BONUS = 1.5;

/**
 * Multiply a shape's weight, remembering the total in `massBonus` so it can
 * be saved and survive anything that recomputes `mass` from the size.
 */
export function applyMassBonus(shape, factor) {
  if (!(factor > 0) || !Number.isFinite(factor)) return;
  const current = shape.massBonus ?? 1;
  const next = Math.min(MAX_MASS_BONUS, current * factor);
  shape.mass *= next / current;
  shape.massBonus = next;
}

const AREA_PER_SIZE2 = { Circle: Math.PI, Square: 1, Triangle: Math.sqrt(3) / 4 };

const baseSizeOf = (shape) => (shape instanceof Circle ? shape.baseRadius : shape.baseSide);
/** Area in base units (radius for circles, side for polygons). */
const baseArea = (shape) => AREA_PER_SIZE2[shape.getName()] * baseSizeOf(shape) ** 2;

/**
 * Fusion skill: two shapes of the same type merge into one.
 *
 *   fuseShapes(a, b, { scaleFactor, maxBaseSize, maxSpeed, promoteTo, speedBonus, massBonus })
 *     -> shape | null
 *
 * - Size: areas add up, so the board never gains area.
 * - Speed: the speeds add up, times (1 + speedBonus), capped at `maxSpeed`,
 *   along the direction of the combined momentum.
 * - Weight: the heavier parent's bonus, times (1 + massBonus).
 * - Value: `value` (points per hit, default 1) adds up, so fewer shapes earn
 *   at least as much.
 * - Upgrade: with `promoteTo` ('Triangle', 'Square', ...) the result is that
 *   shape instead, with the same total area and worth PROMOTION_VALUE_BONUS ×.
 * - Position: the centre of mass of the two.
 *
 * Returns null (no fusion) when the types differ or the result would be
 * bigger than `maxBaseSize` (base units, of the resulting shape type).
 */
export function fuseShapes(a, b, {
  scaleFactor = 1,
  maxBaseSize = Infinity,
  maxSpeed = Infinity,
  promoteTo = null,
  speedBonus = 0,
  massBonus = 0,
} = {}) {
  if (a.getName() !== b.getName()) return null;
  const type = promoteTo ?? a.getName();
  if (!(type in AREA_PER_SIZE2)) return null;

  const base = Math.sqrt((baseArea(a) + baseArea(b)) / AREA_PER_SIZE2[type]);
  if (!(base <= maxBaseSize)) return null;

  const totalMass = a.mass + b.mass;
  const wa = a.mass / totalMass;
  const wb = b.mass / totalMass;
  const x = a.center.x * wa + b.center.x * wb;
  const y = a.center.y * wa + b.center.y * wb;

  const speed = Math.min(
    (Math.hypot(a.velocity.x, a.velocity.y) + Math.hypot(b.velocity.x, b.velocity.y)) * (1 + Math.max(0, speedBonus)),
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
  const rotation = heavier.rotation ?? 0;
  const size = base * scaleFactor;
  let fused;
  if (type === 'Circle') {
    fused = Circle.create(x, y, size, heavier.color, vx, vy, base);
  } else if (type === 'Square') {
    fused = Square.create(x, y, size, rotation, heavier.color, vx, vy, base);
  } else {
    fused = Triangle.create(x, y, size, rotation, heavier.color, vx, vy, base);
  }

  const value = (a.value ?? 1) + (b.value ?? 1);
  fused.value = promoteTo ? value * PROMOTION_VALUE_BONUS : value;
  const inherited = Math.max(a.massBonus ?? 1, b.massBonus ?? 1);
  applyMassBonus(fused, inherited * (1 + Math.max(0, massBonus)));
  return fused;
}
