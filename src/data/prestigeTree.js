/**
 * Prestige upgrade tree definition: data only.
 *
 * `PrestigePopup` hands these nodes to the generic `NodeGraph`, which lays
 * them out automatically (rows from `requires`, order chosen to reduce line
 * crossings) and draws the connecting lines. You never choose a position.
 *
 * ── Adding an upgrade ────────────────────────────────────────────────
 * 1. Add the upgrade to `src/shops/prestigeShop.js` (name / price / maxLevel).
 * 2. Add a node here with the SAME `item` name and list what it needs in
 *    `requires`. Locked nodes stay hidden until every requirement is met,
 *    and the tree re-lays itself out as nodes unlock.
 * 3. Handle its effect in `Server.applyPrestigeUpgradeEffect`.
 *
 * ── Adding a whole new path ──────────────────────────────────────────
 * Add a key to `BRANCHES` (it only controls the colour/label), then add
 * nodes with that `branch`. Lines are generated from `requires`, so you
 * never hand-maintain a list of edges.
 *
 * Node fields
 *   id          unique string used by `requires`
 *   item        name of the matching entry in prestigeShop (defaults to id)
 *   label       text shown on the node (clamped to 2 lines; full text on hover)
 *   icon        single emoji/character shown on the node
 *   branch      key of BRANCHES — controls the colour
 *   requires    [] | ['other-id'] | [{ id: 'other-id', level: 3 }]
 *               A bare string means "at least level 1".
 *   pin         optional { col, row } to force a node into a fixed slot.
 *               Only use it when the automatic layout really isn't right.
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
    requires: ['speed-collision-value', 'size-collision-value'],
    description: 'Adds collision value based on mass (speed × size).',
    effectKey: 'massCollisionValue',
  },
];
