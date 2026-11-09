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
