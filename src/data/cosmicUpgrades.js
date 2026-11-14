/**
 * Cosmic upgrades: bought with black holes (◉) and supernovas (✷) in the
 * store's Cosmos tab. Run-only: they reset on prestige with the currencies.
 *
 * Upgrade fields
 *   id, name, icon (plain Unicode text, never emoji), description
 *   maxLevel
 *   cost(level)     -> { blackHoles, supernovas } for the NEXT level (level = current level)
 *   effect(level)   -> { effectKey: value } summed across upgrades (see Cosmos.effect)
 *   describe(level) -> one-line text for the current effect
 *   requiresBoth    only shown once the run has had a black hole AND a supernova
 *
 * Effect keys (all additive bonuses; 0 when nothing is bought)
 *   circleWallBonus       circles' wall hits ×(1 + value)
 *   collisionValueBonus   squares'/triangles' collisions ×(1 + value)
 *   clickValueBonus       clicks ×(1 + value)
 *   prestigeGainBonus     prestige award ×(1 + value)
 *   startingCircles       extra circles left behind after a wipe
 *   blackHoleThresholdLevels / supernovaThresholdLevels
 *                         each level shrinks that threshold (see Cosmos)
 *   eventMultiplierBonus  added to the ×9 money multiplier of FUTURE events
 *   addShapePriceCut      subtracted from the ×10 add-shape price jump of FUTURE events
 */

const each = (level, base = 1) => base + level; // 1, 2, 3 … for the next level

export const BLACK_HOLE_THRESHOLD_STEP = 0.5;
export const SUPERNOVA_THRESHOLD_STEP = 0.6;

export const COSMIC_UPGRADES = [
  // ── Black holes ──────────────────────────────────────────────
  {
    id: 'accretion-disk',
    name: 'Accretion Disk',
    icon: '◉¤',
    description: 'Matter spirals in: circles earn more from wall hits.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: each(level), supernovas: 0 }),
    effect: (level) => ({ circleWallBonus: level }),
    describe: (level) => `×${1 + level} circle wall-hit value`,
  },
  {
    id: 'event-horizon',
    name: 'Event Horizon',
    icon: '◉↓',
    description: 'The next black hole needs half as much mass per level.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: each(level), supernovas: 0 }),
    effect: (level) => ({ blackHoleThresholdLevels: level }),
    describe: (level) => `×${(BLACK_HOLE_THRESHOLD_STEP ** level).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} black hole mass`,
  },
  {
    id: 'hawking-radiation',
    name: 'Hawking Radiation',
    icon: '◉+',
    description: 'Every wipe leaves 2 more circles behind per level.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: each(level), supernovas: 0 }),
    effect: (level) => ({ startingCircles: 2 * level }),
    describe: (level) => `+${2 * level} circles after each wipe`,
  },
  // ── Supernovas ───────────────────────────────────────────────
  {
    id: 'shockwave',
    name: 'Shockwave',
    icon: '✷¤',
    description: 'Squares and triangles earn more from collisions.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: 0, supernovas: each(level) }),
    effect: (level) => ({ collisionValueBonus: level }),
    describe: (level) => `×${1 + level} square & triangle collision value`,
  },
  {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    icon: '✷↓',
    description: 'The next supernova needs a slower collision.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: 0, supernovas: each(level) }),
    effect: (level) => ({ supernovaThresholdLevels: level }),
    describe: (level) => `×${(SUPERNOVA_THRESHOLD_STEP ** level).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} supernova speed`,
  },
  {
    id: 'stardust',
    name: 'Stardust',
    icon: '✷⌖',
    description: 'Clicks are worth more.',
    maxLevel: 3,
    cost: (level) => ({ blackHoles: 0, supernovas: each(level) }),
    effect: (level) => ({ clickValueBonus: level }),
    describe: (level) => `×${1 + level} click value`,
  },
  // ── Both ─────────────────────────────────────────────────────
  {
    id: 'quasar',
    name: 'Quasar',
    icon: '◉✷',
    description: 'Future black holes and supernovas multiply money by 1 more per level.',
    maxLevel: 3,
    requiresBoth: true,
    cost: (level) => ({ blackHoles: each(level), supernovas: each(level) }),
    effect: (level) => ({ eventMultiplierBonus: level }),
    describe: (level) => `future events give ×${9 + level} money`,
  },
  {
    id: 'neutron-star',
    name: 'Neutron Star',
    icon: '◉■',
    description: 'Future events raise Add Ball/Square/Triangle prices less.',
    maxLevel: 3,
    requiresBoth: true,
    cost: (level) => ({ blackHoles: each(level), supernovas: each(level) }),
    effect: (level) => ({ addShapePriceCut: 2 * level }),
    describe: (level) => `future events raise add-shape prices ×${10 - 2 * level}`,
  },
  {
    id: 'gravitational-lens',
    name: 'Gravitational Lens',
    icon: '◉✦',
    description: 'This run is worth more prestige points.',
    maxLevel: 3,
    requiresBoth: true,
    cost: (level) => ({ blackHoles: each(level, 2), supernovas: each(level, 2) }),
    effect: (level) => ({ prestigeGainBonus: 0.5 * level }),
    describe: (level) => `×${1 + 0.5 * level} prestige award`,
  },
];
