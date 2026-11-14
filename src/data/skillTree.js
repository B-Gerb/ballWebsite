/**
 * Skill tree definition: data + rules, no UI.
 *
 * Skills are the late-game layer above prestige:
 *   1. Unlock the Skills tab once for a huge pile of prestige points.
 *   2. Buy skill points with prestige points (each costs more than the last).
 *   3. Skill points unlock a skill permanently (rank 1). That turns on its
 *      `base` effect and adds its `choices` to the level-bar pool.
 *   4. More skill points rank an unlocked skill up, to MAX_RANK (5). Going
 *      from rank r to r + 1 costs r + 1 points (or the node's `rankCosts`).
 *      Rank multiplies the base effect (x rank) and every level-bar pick of
 *      that skill (x (1 + RANK_CHOICE_BONUS * (rank - 1)), i.e. +25% a rank).
 *   5. Each prestige run has a level bar filled by shape collisions. Every
 *      level-up offers a few choices drawn from the unlocked skills; picks
 *      stack for the rest of the run and reset on prestige. Ranks are kept.
 *
 * ── Adding a skill ───────────────────────────────────────────────────
 * Add a node below with a `base` effect and its `choices`, then read any new
 * effect key in `Server.applySkillEffects` (and give it a default in
 * `EMPTY_EFFECTS`). Every effect key is summed across the base and all picks
 * (after rank scaling). Choice ids must be unique across the whole tree.
 *
 * Node fields (on top of the NodeGraph fields: id/label/icon/branch/requires)
 *   unlockCost   skill points to unlock it (rank 0 -> 1)
 *   rankCosts    optional [rank 1->2, 2->3, 3->4, 4->5] costs; default rank + 1
 *   base         { effectKey: value } at rank 1, multiplied by the rank
 *   describeBase (rank) -> one-line text for the base effect at that rank
 *                (a plain string also works; read it with `describeBaseAt`)
 *   choices      level-bar upgrades:
 *                  { id, label, icon, description, maxStacks,
 *                    effect(stacks) -> { effectKey: value },
 *                    describe(stacks) -> one-line text }
 */

export const SKILL_BRANCHES = {
  fusion: { label: 'Fusion', color: '#f97316' },
  impact: { label: 'Impact', color: '#22c55e' },
  storm: { label: 'Storm', color: '#38bdf8' },
  cosmos: { label: 'Cosmos', color: '#a78bfa' },
};

/** Highest rank a skill can reach. */
export const MAX_RANK = 5;
/** Each rank above 1 makes that skill's level-bar picks this much stronger. */
export const RANK_CHOICE_BONUS = 0.25;

/** Every effect a skill can produce, with its "nothing unlocked" value. */
export const EMPTY_EFFECTS = Object.freeze({
  // Shape Fusion
  fusionChance: 0,
  fusionPromoteChance: 0,
  fusionSpeedBonus: 0,
  fusionMassBonus: 0,
  // Collision Click
  collisionClickChance: 0,
  boostPowerPerClick: 0,
  boostFramesPerClick: 0,
  // Chain Lightning
  lightningChance: 0,
  lightningChainChance: 0,
  lightningChargeBonus: 0,
  // Gravity Well / Stellar Forge (cosmic events; the server clamps the cuts at 0.9)
  blackHoleThresholdCut: 0, // fraction cut from the black-hole total-mass threshold
  supernovaThresholdCut: 0, // fraction cut from the supernova impact-speed threshold
  cosmicMultiplierBonus: 0, // added to the x9 money multiplier a black hole / supernova grants
  spawnMassBonus: 0, // newly bought shapes get x(1 + value) mass
  spawnSpeedBonus: 0, // newly bought shapes get x(1 + value) speed
});

/** Fusion "shape upgrade" order (matches the prestige unlock order). */
export const SHAPE_TIERS = ['Circle', 'Triangle', 'Square'];

const pct = (value, digits = 2) => `${(value * 100).toFixed(digits)}%`;

/** Base-effect text of a node at a rank (works for string or function `describeBase`). */
export const describeBaseAt = (node, rank = 1) =>
  typeof node.describeBase === 'function' ? node.describeBase(Math.max(1, rank)) : node.describeBase ?? '';

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
    unlockCost: 1,
    base: { fusionChance: 0.005 },
    describeBase: (r) => `${pct(0.005 * r)} fusion chance per same-type collision`,
    choices: [
      {
        id: 'fusion-chance',
        label: 'Volatile Bonds',
        icon: '⊕+',
        description: 'Same-type collisions fuse more often.',
        maxStacks: 20,
        effect: (n) => ({ fusionChance: 0.0025 * n }),
        describe: (n) => `+${pct(0.0025 * n)} fusion chance`,
      },
      {
        id: 'fusion-promote',
        label: 'Ascension',
        icon: '●→▲',
        description:
          'A fusion can upgrade the pair into the next shape (circle → triangle → square). ' +
          'Upgraded shapes are worth 50% more.',
        maxStacks: 10,
        effect: (n) => ({ fusionPromoteChance: 0.1 * n }),
        describe: (n) => `${pct(0.1 * n, 0)} of fusions upgrade the shape`,
      },
      {
        id: 'fusion-momentum',
        label: 'Momentum',
        icon: '⊕»',
        description: 'Fused shapes come out faster and heavier.',
        maxStacks: 10,
        effect: (n) => ({ fusionSpeedBonus: 0.1 * n, fusionMassBonus: 0.1 * n }),
        describe: (n) => `fused shapes get +${pct(0.1 * n, 0)} speed and weight`,
      },
    ],
  },
  {
    id: 'collision-click',
    label: 'Collision Click',
    icon: '✱',
    branch: 'impact',
    requires: [],
    description:
      'Shape collisions have a chance to press the clicker for you. ' +
      'Each one earns a full click, with all your click multipliers.',
    unlockCost: 1,
    base: { collisionClickChance: 0.01 },
    describeBase: (r) => `${pct(0.01 * r, 1)} of shape collisions trigger a click`,
    choices: [
      {
        id: 'click-chance',
        label: 'Hair Trigger',
        icon: '✱+',
        description: 'Collisions trigger clicks more often.',
        maxStacks: 20,
        effect: (n) => ({ collisionClickChance: 0.005 * n }),
        describe: (n) => `+${pct(0.005 * n, 1)} click chance`,
      },
      {
        id: 'boost-power',
        label: 'Overclock',
        icon: '✱×',
        description:
          'Every collision click nudges your running boosts up a little (×1.75 → ×1.75005). ' +
          'The extra lasts until that boost ends or is bought again.',
        maxStacks: 10,
        effect: (n) => ({ boostPowerPerClick: 0.00005 * n }),
        describe: (n) => `+${(0.00005 * n).toFixed(5)} to running boosts per collision click`,
      },
      {
        id: 'boost-time',
        label: 'Extended Play',
        icon: '✱⧗',
        description: 'Every collision click adds a little time to your running boosts.',
        maxStacks: 10,
        effect: (n) => ({ boostFramesPerClick: 3 * n }),
        describe: (n) => `+${((3 * n) / 60).toFixed(2)} s to running boosts per collision click`,
      },
    ],
  },
  {
    id: 'chain-lightning',
    label: 'Chain Lightning',
    icon: 'ϟ',
    branch: 'storm',
    requires: [],
    description:
      'Whenever a shape earns money there is a small chance lightning jumps to another random ' +
      'shape, which earns its own value too.',
    unlockCost: 1,
    base: { lightningChance: 0.005 },
    describeBase: (r) => `${pct(0.005 * r, 1)} chance per scoring hit to strike another shape`,
    choices: [
      {
        id: 'lightning-chance',
        label: 'Static Charge',
        icon: 'ϟ+',
        description: 'Lightning strikes more often.',
        maxStacks: 20,
        effect: (n) => ({ lightningChance: 0.0025 * n }),
        describe: (n) => `+${pct(0.0025 * n)} strike chance`,
      },
      {
        id: 'lightning-charge',
        label: 'Supercharge',
        icon: 'ϟ»',
        description: 'Struck shapes permanently gain a little speed and weight (until prestige).',
        maxStacks: 10,
        effect: (n) => ({ lightningChargeBonus: 0.01 * n }),
        describe: (n) => `struck shapes gain +${pct(0.01 * n, 0)} speed and weight`,
      },
      {
        id: 'lightning-chain',
        label: 'Forked Bolt',
        icon: 'ϟϟ',
        description: 'A struck shape can strike yet another shape, and so on.',
        maxStacks: 8,
        effect: (n) => ({ lightningChainChance: 0.1 * n }),
        describe: (n) => `${pct(0.1 * n, 0)} chance each strike jumps again`,
      },
    ],
  },
  {
    id: 'gravity-well',
    label: 'Gravity Well',
    icon: '◉',
    branch: 'cosmos',
    requires: ['shape-fusion'],
    description:
      'A black hole forms when the shapes on the board get heavy enough. Gravity Well lowers ' +
      'that mass threshold, so black holes (and their money multiplier) come sooner.',
    unlockCost: 3,
    base: { blackHoleThresholdCut: 0.1 },
    describeBase: (r) => `black holes need ${pct(0.1 * r, 0)} less total mass`,
    choices: [
      {
        id: 'dense-matter',
        label: 'Dense Matter',
        icon: '◉+',
        description: 'Newly bought shapes are heavier.',
        maxStacks: 10,
        effect: (n) => ({ spawnMassBonus: 0.1 * n }),
        describe: (n) => `new shapes get +${pct(0.1 * n, 0)} mass`,
      },
      {
        id: 'singularity',
        label: 'Singularity',
        icon: '◉×',
        description: 'Black holes and supernovas multiply your money a little more.',
        maxStacks: 10,
        effect: (n) => ({ cosmicMultiplierBonus: 0.1 * n }),
        describe: (n) => `+${(0.1 * n).toFixed(1)} to the black hole / supernova multiplier`,
      },
      {
        id: 'tidal-pull',
        label: 'Tidal Pull',
        icon: '◉⊕',
        description: 'Same-type collisions fuse more often.',
        maxStacks: 10,
        effect: (n) => ({ fusionChance: 0.0025 * n }),
        describe: (n) => `+${pct(0.0025 * n)} fusion chance`,
      },
    ],
  },
  {
    id: 'stellar-forge',
    label: 'Stellar Forge',
    icon: '✷',
    branch: 'cosmos',
    requires: ['chain-lightning'],
    description:
      'A supernova goes off when two shapes collide fast enough. Stellar Forge lowers that ' +
      'impact-speed threshold, so supernovas (and their money multiplier) come sooner.',
    unlockCost: 3,
    base: { supernovaThresholdCut: 0.1 },
    describeBase: (r) => `supernovas need ${pct(0.1 * r, 0)} less impact speed`,
    choices: [
      {
        id: 'kinetic-core',
        label: 'Kinetic Core',
        icon: '✷»',
        description: 'Newly bought shapes are faster.',
        maxStacks: 10,
        effect: (n) => ({ spawnSpeedBonus: 0.05 * n }),
        describe: (n) => `new shapes get +${pct(0.05 * n, 0)} speed`,
      },
      {
        id: 'nova-echo',
        label: 'Nova Echo',
        icon: '✷×',
        description: 'Black holes and supernovas multiply your money a little more.',
        maxStacks: 10,
        effect: (n) => ({ cosmicMultiplierBonus: 0.1 * n }),
        describe: (n) => `+${(0.1 * n).toFixed(1)} to the black hole / supernova multiplier`,
      },
      {
        id: 'flashpoint',
        label: 'Flashpoint',
        icon: '✷ϟ',
        description: 'Lightning strikes more often.',
        maxStacks: 10,
        effect: (n) => ({ lightningChance: 0.0025 * n }),
        describe: (n) => `+${pct(0.0025 * n)} strike chance`,
      },
    ],
  },
];

/** Every level-bar choice, with the id of the skill it belongs to. */
export const SKILL_CHOICES = SKILL_NODES.flatMap((node) =>
  node.choices.map((choice) => ({ ...choice, skillId: node.id })),
);

const addInto = (total, effect, scale = 1) => {
  for (const [key, value] of Object.entries(effect)) {
    if (Number.isFinite(value)) total[key] = (total[key] ?? 0) + value * scale;
  }
};

/** A rank lookup result as a whole rank: true -> 1, false -> 0, capped at MAX_RANK. */
const toRank = (value) => {
  if (value === true) return 1;
  const rank = Math.floor(Number(value));
  return Number.isFinite(rank) && rank > 0 ? Math.min(rank, MAX_RANK) : 0;
};

/** How strongly a skill's level-bar picks count at a rank (1 at rank 1, +25% a rank). */
export const choiceScale = (rank) => 1 + RANK_CHOICE_BONUS * (Math.max(1, rank) - 1);

/**
 * Combined effects: the base of every unlocked skill (x rank) plus every
 * stacked level-bar pick whose skill is unlocked (x choiceScale(rank)).
 *
 *   skillEffects(rankOf: (id) => rank | boolean, picks: { choiceId: stacks })
 *
 * `rankOf` returns 0 for a locked skill; booleans still work (true = rank 1).
 */
export function skillEffects(rankOf, picks = {}, nodes = SKILL_NODES) {
  const total = { ...EMPTY_EFFECTS };
  for (const node of nodes) {
    const rank = toRank(rankOf(node.id));
    if (rank === 0) continue;
    addInto(total, node.base ?? {}, rank);
    const scale = choiceScale(rank);
    for (const choice of node.choices ?? []) {
      const stacks = Math.min(picks[choice.id] ?? 0, choice.maxStacks ?? Infinity);
      if (stacks > 0) addInto(total, choice.effect(stacks), scale);
    }
  }
  return total;
}
