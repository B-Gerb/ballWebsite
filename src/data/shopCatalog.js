/**
 * How each regular-shop item looks in the store: icon + one-line blurb.
 * Prices/levels live in the shop classes; this file is display only.
 *
 * Adding a shop item? Add an entry here with the SAME name, or it falls
 * back to a generic icon (and tests/shopCatalog.test.js will remind you).
 */

export const STORE_SECTIONS = {
  ballShop: { title: 'Circles', currency: 'balance', accent: '#38bdf8' },
  squareShop: { title: 'Squares', currency: 'balance', accent: '#34d399' },
  triangleShop: { title: 'Triangles', currency: 'balance', accent: '#f472b6' },
  clickShop: { title: 'Clicker', currency: 'click', accent: '#fbbf24' },
};

/** Buy-amount toggle in the store header (like Cookie Clicker's 1 / 10 / 100). */
export const STORE_BUY_AMOUNTS = [1, 10, 100];

export const SHOP_CATALOG = {
  'Add Ball': { icon: '⚪', description: 'Adds another circle to the board.' },
  'Increase Ball Size Range Min': { icon: '🔍', description: 'New circles spawn at least this big.' },
  'Increase Ball Size Range Max': { icon: '📏', description: 'New circles can spawn bigger.' },
  'Increase Ball Speed Min': { icon: '💨', description: 'New circles move at least this fast.' },
  'Increase Ball Speed Max': { icon: '⚡', description: 'New circles can move faster.' },
  'Decrease Large Circle Size': { icon: '🎯', description: 'Shrinks the arena so shapes hit the wall more.' },

  'Add Square': { icon: '🟩', description: 'Adds another square to the board.' },
  'Increase Square Size Range Min': { icon: '🔍', description: 'New squares spawn at least this big.' },
  'Increase Square Size Range Max': { icon: '📏', description: 'New squares can spawn bigger.' },
  'Increase Square Speed Min': { icon: '💨', description: 'New squares move at least this fast.' },
  'Increase Square Speed Max': { icon: '⚡', description: 'New squares can move faster.' },

  'Add Triangle': { icon: '🔺', description: 'Adds another triangle to the board.' },
  'Increase Triangle Size Range Min': { icon: '🔍', description: 'New triangles spawn at least this big.' },
  'Increase Triangle Size Range Max': { icon: '📏', description: 'New triangles can spawn bigger.' },
  'Increase Triangle Speed Min': { icon: '💨', description: 'New triangles move at least this fast.' },
  'Increase Triangle Speed Max': { icon: '⚡', description: 'New triangles can move faster.' },

  'Increase Click Value': { icon: '👆', description: 'Each click is worth more.' },
  'Temporary Click Value Multiplier': { icon: '✨', description: 'Boosts click value for 10 seconds.' },
  'Temporary Ball Value Multiplier': { icon: '💰', description: 'Boosts shape value for 10 seconds.' },
  'Temporary Speed Multiplier': { icon: '🚀', description: 'Boosts shape speed for 10 seconds.' },
};

const FALLBACK = { icon: '⬆️', description: '' };

export const catalogEntry = (name) => SHOP_CATALOG[name] ?? FALLBACK;
