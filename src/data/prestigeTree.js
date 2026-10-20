/**
 * Prestige upgrade tree definition.
 *
 * This file is the single source of truth for the prestige shop layout.
 * `PrestigePopup` reads it and derives everything else (node positions,
 * connecting lines, lock state, tooltips), so adding content only means
 * editing the data below.
 *
 * ── Adding an upgrade ────────────────────────────────────────────────
 * 1. Add the upgrade to `src/shops/prestigeShop.js` (name / price / maxLevel).
 * 2. Add a node here with the SAME `item` name, then give it a `col`/`row`
 *    and list what it needs in `requires`. Locked nodes stay hidden in the
 *    shop until every requirement is purchased.
 * 3. Handle its effect in `Server.applyPrestigeUpgradeEffect`.
 *
 * ── Adding a whole new path ──────────────────────────────────────────
 * Add a key to `BRANCHES` (it only controls the colour/label of the lane),
 * then add nodes with that `branch` in a free `col`. Lines between nodes
 * are generated from `requires`, so you never hand-maintain a list of edges.
 *
 * Node fields
 *   id          unique string used by `requires`
 *   item        name of the matching entry in prestigeShop (defaults to id)
 *   label       text shown on the node
 *   icon        single emoji/character shown on the node
 *   branch      key of BRANCHES — controls the lane colour
 *   col / row   grid coordinates. col = horizontal lane, row = depth.
 *               They may be fractional (e.g. col: 1.5) to fan a path out.
 *   requires    [] | ['other-id'] | [{ id: 'other-id', level: 3 }]
 *               A bare string means "at least level 1".
 *   description one line shown in the detail panel
 *   effectKey   key used by the matching shop item to format its effect
 */

export const BRANCHES = {
  core: { label: 'Core', color: '#a855f7' },
  motion: { label: 'Motion', color: '#38bdf8' },
  growth: { label: 'Growth', color: '#34d399' },
  click: { label: 'Clicking', color: '#fbbf24' },
  economy: { label: 'Economy', color: '#fb7185' },
};

export const PRESTIGE_NODES = [
  {
    id: 'unlock-triangle',
    item: 'Unlock Triangle',
    label: 'Unlock Triangle',
    icon: '🔺',
    branch: 'core',
    col: 0,
    row: 0,
    requires: [],
    description: 'Unlocks the triangle route and the next generation of prestige upgrades.',
    effectKey: 'unlockTriangle',
  },
  {
    id: 'unlock-square',
    item: 'Unlock Square',
    label: 'Unlock Square',
    icon: '⬛',
    branch: 'core',
    col: 0,
    row: 1,
    requires: ['unlock-triangle'],
    description: 'Unlocks square shapes in the shop.',
    effectKey: 'unlockSquare',
  },
  {
    id: 'circle-wall-value',
    item: 'Increase Circle Wall Hit Value',
    label: 'Circle Wall Value',
    icon: '⭕',
    branch: 'economy',
    col: 1,
    row: 1,
    requires: ['unlock-triangle'],
    description: 'Increases the value earned when circles hit the wall.',
    effectKey: 'circleWallValue',
  },
  {
    id: 'triangle-value',
    item: 'Increase Triangle Value',
    label: 'Triangle Value',
    icon: '🔺',
    branch: 'motion',
    col: 0,
    row: 2,
    requires: ['unlock-square'],
    description: 'Improves the value of triangle progress and unlocks triangle upgrades.',
    effectKey: 'triangleValue',
  },
  {
    id: 'square-value',
    item: 'Increase Square Value',
    label: 'Square Value',
    icon: '⬛',
    branch: 'growth',
    col: 1,
    row: 2,
    requires: ['unlock-square'],
    description: 'Improves the value of square collisions and unlocks square upgrades.',
    effectKey: 'squareValue',
  },
  {
    id: 'triangle-size',
    item: 'Increase Triangle Size',
    label: 'Triangle Size',
    icon: '📐',
    branch: 'motion',
    col: -1,
    row: 3,
    requires: ['triangle-value'],
    description: 'Increases the size contribution of triangle progression.',
    effectKey: 'triangleSize',
  },
  {
    id: 'triangle-speed',
    item: 'Increase Triangle Speed',
    label: 'Triangle Speed',
    icon: '💨',
    branch: 'motion',
    col: 0,
    row: 3,
    requires: ['triangle-value'],
    description: 'Increases triangle speed.',
    effectKey: 'triangleSpeed',
  },
  {
    id: 'triangle-collision-value',
    item: 'Increase Triangle Collision Value',
    label: 'Triangle Collision Value',
    icon: '💎',
    branch: 'motion',
    col: 1,
    row: 3,
    requires: ['triangle-value'],
    description: 'Increases the value of triangle collisions.',
    effectKey: 'triangleCollisionValue',
  },
  {
    id: 'square-size',
    item: 'Increase Square Size',
    label: 'Square Size',
    icon: '📐',
    branch: 'growth',
    col: 2,
    row: 3,
    requires: ['square-value'],
    description: 'Increases the size contribution of square progression.',
    effectKey: 'squareSize',
  },
  {
    id: 'square-speed',
    item: 'Increase Square Speed',
    label: 'Square Speed',
    icon: '💨',
    branch: 'growth',
    col: 3,
    row: 3,
    requires: ['square-value'],
    description: 'Increases square speed.',
    effectKey: 'squareSpeed',
  },
  {
    id: 'square-collision-value',
    item: 'Increase Square Collision Value',
    label: 'Square Collision Value',
    icon: '💎',
    branch: 'growth',
    col: 4,
    row: 3,
    requires: ['square-value'],
    description: 'Increases the value of square collisions.',
    effectKey: 'squareCollisionValue',
  },
  {
    id: 'click-value',
    item: 'Increase Click Value',
    label: 'Click Value',
    icon: '👆',
    branch: 'click',
    col: 2,
    row: 2,
    requires: ['circle-wall-value'],
    description: 'Increases points earned from clicks.',
    effectKey: 'clickValue',
  },
  {
    id: 'click-effectiveness',
    item: 'Increase Click Upgrade Effectiveness',
    label: 'Click Upgrade Effectiveness',
    icon: '🖱️',
    branch: 'click',
    col: 5,
    row: 3,
    requires: ['click-value'],
    description: 'Makes every click-shop upgrade more effective.',
    effectKey: 'clickUpgradeEffectiveness',
  },
  {
    id: 'circle-cost-scaling',
    item: 'Decrease Circle Cost Scaling',
    label: 'Circle Cost Scaling',
    icon: '📉',
    branch: 'economy',
    col: 3,
    row: 2,
    requires: ['circle-wall-value'],
    description: 'Reduces how quickly circle upgrade costs grow.',
    effectKey: 'circleCostScaling',
  },
  {
    id: 'square-cost-scaling',
    item: 'Decrease Square Cost Scaling',
    label: 'Square Cost Scaling',
    icon: '📉',
    branch: 'economy',
    col: 6,
    row: 3,
    requires: ['circle-cost-scaling'],
    description: 'Reduces how quickly square upgrade costs grow.',
    effectKey: 'squareCostScaling',
  },
  {
    id: 'triangle-cost-scaling',
    item: 'Decrease Triangle Cost Scaling',
    label: 'Triangle Cost Scaling',
    icon: '📉',
    branch: 'economy',
    col: 3,
    row: 4,
    requires: ['square-cost-scaling'],
    description: 'Reduces how quickly triangle upgrade costs grow.',
    effectKey: 'triangleCostScaling',
  },
  {
    id: 'currency-multiplier',
    item: 'Global Currency Multiplier',
    label: 'Global Currency',
    icon: '💰',
    branch: 'economy',
    col: 4,
    row: 2,
    requires: ['circle-wall-value'],
    description: 'Multiplies all normal currency earned.',
    effectKey: 'currencyMultiplier',
  },
  {
    id: 'global-speed',
    item: 'Global Speed',
    label: 'Global Speed',
    icon: '⚡',
    branch: 'motion',
    col: 7,
    row: 3,
    requires: ['currency-multiplier'],
    description: 'Increases speed for every shape.',
    effectKey: 'globalSpeed',
  },
  {
    id: 'global-size',
    item: 'Global Size',
    label: 'Global Size',
    icon: '🔵',
    branch: 'growth',
    col: 8,
    row: 3,
    requires: ['currency-multiplier'],
    description: 'Increases size for every shape and its value contribution.',
    effectKey: 'globalSize',
  },
  {
    id: 'prestige-gain',
    item: 'Prestige Value Increase',
    label: 'Prestige Value',
    icon: '✨',
    branch: 'core',
    col: 9,
    row: 3,
    requires: ['currency-multiplier'],
    description: 'Increases future prestige awards.',
    effectKey: 'prestigeGain',
  },
  {
    id: 'speed-collision-value',
    item: 'Collision Value From Speed',
    label: 'Speed Collision Value',
    icon: '🏎️',
    branch: 'motion',
    col: 7,
    row: 4,
    requires: ['global-speed'],
    description: 'Adds collision value based on shape speed.',
    effectKey: 'speedCollisionValue',
  },
  {
    id: 'size-collision-value',
    item: 'Collision Value From Size',
    label: 'Size Collision Value',
    icon: '📏',
    branch: 'growth',
    col: 8,
    row: 4,
    requires: ['global-size'],
    description: 'Adds collision value based on shape size.',
    effectKey: 'sizeCollisionValue',
  },
  {
    id: 'mass-collision-value',
    item: 'Collision Value From Mass',
    label: 'Mass Collision Value',
    icon: '⚖️',
    branch: 'core',
    col: 7,
    row: 5,
    requires: ['speed-collision-value', 'size-collision-value'],
    description: 'Adds collision value based on mass (speed × size).',
    effectKey: 'massCollisionValue',
  },
];

/*
 * Example — a new two-node path branching off "Bigger Arena" into a free
 * lane (col 4). Copy, rename, add the matching prestigeShop entries:
 *
 *   {
 *     id: 'auto-spawn',
 *     item: 'Auto Spawn',
 *     label: 'Auto Spawn',
 *     icon: '🌀',
 *     branch: 'growth',
 *     col: 4, row: 1,
 *     requires: [{ id: 'increase-circle-size', level: 3 }],
 *     description: 'Spawns a shape every few seconds on its own.',
 *     effect: (level) => `${level} shape/s`,
 *   },
 *   {
 *     id: 'auto-spawn-speed',
 *     item: 'Auto Spawn Speed',
 *     label: 'Spawn Rate',
 *     icon: '⏱️',
 *     branch: 'growth',
 *     col: 4, row: 2,
 *     requires: ['auto-spawn'],
 *     description: 'Shortens the auto spawn interval.',
 *   },
 */

/** Pixel geometry of the tree canvas. Zoom/pan scales this at render time. */
export const LAYOUT = {
  nodeSize: 108,
  colGap: 200,
  rowGap: 172,
  padding: 96,
};

const normalizeRequirement = (req) =>
  typeof req === 'string' ? { id: req, level: 1 } : { id: req.id, level: req.level ?? 1 };

/**
 * Turns the declarative node list into positioned nodes plus the edges
 * implied by `requires`, and reports the canvas size needed to hold them.
 */
export function buildTree(nodes = PRESTIGE_NODES, layout = LAYOUT) {
  const { colGap, rowGap, padding } = layout;

  const byId = new Map();
  const positioned = nodes.map((node) => {
    const placed = {
      ...node,
      item: node.item ?? node.label ?? node.id,
      requires: (node.requires ?? []).map(normalizeRequirement),
      x: padding + node.col * colGap,
      y: padding + node.row * rowGap,
    };
    if (import.meta.env?.DEV && byId.has(placed.id)) {
      console.warn(`[prestigeTree] duplicate node id "${placed.id}"`);
    }
    byId.set(placed.id, placed);
    return placed;
  });

  const edges = [];
  positioned.forEach((node) => {
    node.requires.forEach((req) => {
      const from = byId.get(req.id);
      if (!from) {
        if (import.meta.env?.DEV) {
          console.warn(`[prestigeTree] "${node.id}" requires unknown node "${req.id}"`);
        }
        return;
      }
      edges.push({ id: `${req.id}->${node.id}`, from, to: node, level: req.level });
    });
  });

  const width = Math.max(...positioned.map((n) => n.x)) + padding;
  const height = Math.max(...positioned.map((n) => n.y)) + padding;

  return { nodes: positioned, edges, byId, width, height };
}

/**
 * Rounded elbow between two node centres: straight when the nodes share a
 * lane, otherwise down → across → down, which reads much better than a
 * diagonal once several paths overlap.
 */
export function edgePath(from, to, radius = 26) {
  const dx = to.x - from.x;
  if (Math.abs(dx) < 1) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  const midY = (from.y + to.y) / 2;
  const dir = Math.sign(dx);
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(to.y - from.y) / 2);

  return [
    `M ${from.x} ${from.y}`,
    `L ${from.x} ${midY - r}`,
    `Q ${from.x} ${midY} ${from.x + dir * r} ${midY}`,
    `L ${to.x - dir * r} ${midY}`,
    `Q ${to.x} ${midY} ${to.x} ${midY + r}`,
    `L ${to.x} ${to.y}`,
  ].join(' ');
}
