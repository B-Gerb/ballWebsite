/**
 * Skill tree definition: data + rules, no UI.
 *
 * Skills are the late-game layer above prestige:
 *   1. Unlock the Skills tab once for a huge pile of prestige points.
 *   2. Buy skill points with prestige points (each costs more than the last).
 *   3. A skill point unlocks a skill (level 0 → 1).
 *   4. Every further level is paid for with lifetime collisions.
 *
 * ── Adding a skill ───────────────────────────────────────────────────
 * Add a node below with an `effect(level)` that returns the effect keys it
 * contributes, then read that key in `Server.applySkillEffects`.
 *
 * Node fields (on top of the NodeGraph fields: id/label/icon/branch/requires)
 *   maxLevel        highest level
 *   unlockCost      skill points to go from level 0 to 1
 *   collisionCost   (level) -> collisions to go from `level` to `level + 1`
 *   effect          (level) -> { effectKey: value } merged into the effects
 *   describe        (level) -> one-line text for the current effect
 */

export const SKILL_BRANCHES = {
  fusion: { label: 'Fusion', color: '#f97316' },
};

const fusionChance = (level) => (level > 0 ? 0.005 + 0.0025 * (level - 1) : 0);

export const SKILL_NODES = [
  {
    id: 'shape-fusion',
    label: 'Shape Fusion',
    icon: '⊕',
    branch: 'fusion',
    requires: [],
    description:
      'When two shapes of the same type collide they have a slight chance to fuse into one. ' +
      'The fused shape keeps both sizes, adds their speeds together and is worth both of them, ' +
      'so you earn more from fewer shapes (and the board runs smoother).',
    maxLevel: 20,
    unlockCost: 1,
    collisionCost: (level) => Math.round(100000 * 1.8 ** (level - 1)),
    effect: (level) => ({ fusionChance: fusionChance(level) }),
    describe: (level) => `${(fusionChance(level) * 100).toFixed(2)}% fusion chance per same-type collision`,
  },
];
