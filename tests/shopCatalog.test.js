import assert from 'node:assert/strict';
import test from 'node:test';
import baseUpgradeShop from '../src/shops/baseUpgradeShop.js';
import clickShop from '../src/shops/clickShop.js';
import { SHOP_CATALOG, STORE_SECTIONS } from '../src/data/shopCatalog.js';

test('every regular-shop item has a store icon and description', () => {
  const base = new baseUpgradeShop();
  base.addSquaresToShop();
  base.addTrianglesToShop();
  const sections = { ...base.items, clickShop: new clickShop().items };

  for (const [section, items] of Object.entries(sections)) {
    assert.ok(STORE_SECTIONS[section], `${section} has no store section`);
    for (const item of items) {
      const entry = SHOP_CATALOG[item.name];
      assert.ok(entry, `${item.name} is missing from SHOP_CATALOG`);
      assert.ok(entry.icon && entry.description, `${item.name} needs an icon and description`);
    }
  }
});

test('every store icon is a drawn SVG, not an emoji', async () => {
  const { storeIcon } = await import('../src/shops/storeIcons.js');
  for (const [name, entry] of Object.entries(SHOP_CATALOG)) {
    const svg = storeIcon(entry.icon);
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/, `${name} has no drawn icon`);
    assert.notEqual(svg, storeIcon('no-such-icon'), `${name} uses an unknown icon key "${entry.icon}"`);
    assert.doesNotMatch(entry.icon, /\p{Extended_Pictographic}/u, `${name} still uses an emoji`);
  }
});
