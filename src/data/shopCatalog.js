/**
 * How each regular-shop item looks in the store: icon key (drawn by
 * src/shops/storeIcons.js) + one-line blurb.
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

/** Buy-amount toggle in the store header (Cookie Clicker's 1 / 10 / 100, plus max). */
export const STORE_BUY_AMOUNTS = [1, 10, 100, 'max'];

export const SHOP_CATALOG = {
  'Add Ball': { icon: 'circle:add', description: 'Adds another circle to the board.' },
  'Increase Ball Size Range Min': { icon: 'circle:size-min', description: 'New circles spawn at least this big.' },
  'Increase Ball Size Range Max': { icon: 'circle:size-max', description: 'New circles can spawn bigger.' },
  'Increase Ball Speed Min': { icon: 'circle:speed-min', description: 'New circles move at least this fast.' },
  'Increase Ball Speed Max': { icon: 'circle:speed-max', description: 'New circles can move faster.' },
  'Decrease Large Circle Size': { icon: 'arena', description: 'Shrinks the arena so shapes hit the wall more.' },

  'Add Square': { icon: 'square:add', description: 'Adds another square to the board.' },
  'Increase Square Size Range Min': { icon: 'square:size-min', description: 'New squares spawn at least this big.' },
  'Increase Square Size Range Max': { icon: 'square:size-max', description: 'New squares can spawn bigger.' },
  'Increase Square Speed Min': { icon: 'square:speed-min', description: 'New squares move at least this fast.' },
  'Increase Square Speed Max': { icon: 'square:speed-max', description: 'New squares can move faster.' },

  'Add Triangle': { icon: 'triangle:add', description: 'Adds another triangle to the board.' },
  'Increase Triangle Size Range Min': { icon: 'triangle:size-min', description: 'New triangles spawn at least this big.' },
  'Increase Triangle Size Range Max': { icon: 'triangle:size-max', description: 'New triangles can spawn bigger.' },
  'Increase Triangle Speed Min': { icon: 'triangle:speed-min', description: 'New triangles move at least this fast.' },
  'Increase Triangle Speed Max': { icon: 'triangle:speed-max', description: 'New triangles can move faster.' },

  'Increase Click Value': { icon: 'click', description: 'Each click is worth more.' },
  'Temporary Click Value Multiplier': { icon: 'boost:click', description: 'Boosts click value for 10 seconds per level bought.' },
  'Temporary Ball Value Multiplier': { icon: 'boost:value', description: 'Boosts shape value for 10 seconds per level bought.' },
  'Temporary Speed Multiplier': { icon: 'boost:speed', description: 'Boosts shape speed for 10 seconds per level bought.' },
};

const FALLBACK = { icon: 'upgrade', description: '' };

export const catalogEntry = (name) => SHOP_CATALOG[name] ?? FALLBACK;
