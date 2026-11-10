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

test('every icon is plain text symbols, never an emoji', async () => {
  const { PRESTIGE_NODES } = await import('../src/data/prestigeTree.js');
  const { SKILL_NODES } = await import('../src/data/skillTree.js');
  const icons = [
    ...Object.entries(SHOP_CATALOG).map(([name, entry]) => [name, entry.icon]),
    ...PRESTIGE_NODES.map((node) => [node.id, node.icon]),
    ...SKILL_NODES.map((node) => [node.id, node.icon]),
  ];
  for (const [name, icon] of icons) {
    assert.ok(typeof icon === 'string' && icon.length > 0 && icon.length <= 3, `${name} needs a short text icon`);
    assert.doesNotMatch(icon, /\p{Extended_Pictographic}/u, `${name} uses an emoji icon "${icon}"`);
  }
});
