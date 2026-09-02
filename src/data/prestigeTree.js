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
 *   effect      (level) => string, the bonus at that level (optional)
 */

export const BRANCHES = {
  core: { label: 'Core', color: '#a855f7' },
  motion: { label: 'Motion', color: '#38bdf8' },
  growth: { label: 'Growth', color: '#34d399' },
  click: { label: 'Clicking', color: '#fbbf24' },
};

export const PRESTIGE_NODES = [
  {
    id: 'unlock-square',
    item: 'Unlock Square',
    label: 'Unlock Square',
    icon: '⬛',
    branch: 'core',
    col: 0,
    row: 0,
    requires: [],
    description: 'Unlocks square shapes in the shop so they can be spawned on the board.',
    effect: (level) => (level > 0 ? 'Squares available' : 'Squares locked'),
  },
  {
    id: 'increase-circle-size',
    item: 'Increase Base Circle Size',
    label: 'Bigger Arena',
    icon: '⭕',
    branch: 'growth',
    col: 1,
    row: 0,
    requires: [],
    description: 'Grows the container circle so more shapes fit and travel further.',
    effect: (level) => `×${(1 + level * 0.1).toFixed(2)} arena size`,
  },
  {
    id: 'increase-ball-speed',
    item: 'Increase Ball Speed',
    label: 'Ball Speed',
    icon: '💨',
    branch: 'motion',
    col: 0,
    row: 1,
    requires: ['unlock-square'],
    description: 'Every shape moves faster, so collisions — and points — come in quicker.',
    effect: (level) => `×${1 + level * 2} shape speed`,
  },
  {
    id: 'increase-ball-value',
    item: 'Increase Ball Value',
    label: 'Ball Value',
    icon: '💎',
    branch: 'growth',
    col: 1,
    row: 1,
    requires: ['increase-circle-size'],
    description: 'Each collision is worth more points.',
    effect: (level) => `×${1 + level} collision value`,
  },
  {
    id: 'increase-click-value',
    item: 'Increase Click Value',
    label: 'Click Value',
    icon: '👆',
    branch: 'click',
    col: 0,
    row: 2,
    requires: ['increase-ball-speed'],
    description: 'Each click on the clicker canvas is worth more points.',
    effect: (level) => `×${1 + level} click value`,
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
