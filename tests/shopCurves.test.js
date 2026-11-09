import assert from 'node:assert/strict';
import test from 'node:test';
import baseUpgradeShop from '../src/shops/baseUpgradeShop.js';
import clickShop from '../src/shops/clickShop.js';

const allShops = () => {
  const base = new baseUpgradeShop();
  base.addSquaresToShop();
  base.addTrianglesToShop();
  return [
    ...Object.values(base.items).flat().map((item) => ({ shop: base, item })),
    ...new clickShop().items.map((item) => ({ shop: new clickShop(), item })),
  ];
};
const fresh = (name) => allShops().find((e) => e.item.name === name);

test('regular upgrade prices never accelerate and settle at ≤ 50% per level', () => {
  for (const { shop, item } of allShops()) {
    const levels = Math.min(60, (item.maxLevel ?? Infinity) - item.level);
    let price = item.price;
    let lastRatio = Infinity;
    for (let step = 1; step <= levels; step++) {
      const next = shop.itemCost(item, step)[1];
      assert.ok(Number.isFinite(next), `${item.name} overflows by level ${item.level + step}`);
      const ratio = next / price;
      assert.ok(ratio <= lastRatio + 1e-9, `${item.name} speeds up at step ${step}: ×${ratio.toFixed(3)}`);
      lastRatio = ratio;
      price = next;
    }
    assert.ok(lastRatio <= 1.5 + 1e-9, `${item.name} still grows ×${lastRatio.toFixed(2)} per level`);
  }
});

test('the arena-shrink upgrade stops before the arena breaks', () => {
  const { item } = fresh('Decrease Large Circle Size');
  assert.equal(item.maxLevel, 100);
  item.level = item.maxLevel;
  assert.ok(item.getValue() > 0);
});

test('max buys as many levels as the balance covers', () => {
  const { shop, item } = fresh('Add Ball');
  const costOf3 = shop.itemCost(item, 3)[0];
  shop.balance = costOf3 + 0.001;
  assert.deepEqual(shop.maxAffordable(item), { count: 3, cost: costOf3 });

  shop.balance = item.price - 0.01;
  assert.equal(shop.maxAffordable(item).count, 0);
});

test('max never goes past an item\'s max level', () => {
  const { shop, item } = fresh('Decrease Large Circle Size');
  item.level = item.maxLevel - 2;
  shop.balance = 1e300;
  assert.equal(shop.maxAffordable(item).count, 2);
  item.level = item.maxLevel;
  assert.equal(shop.maxAffordable(item).count, 0);
});

test('loading a save re-derives prices from levels, so old steep prices go away', () => {
  const steep = fresh('Increase Ball Size Range Min');
  const bought = fresh('Increase Ball Size Range Min');
  bought.shop.balance = 1e300;
  bought.shop.buyItem(bought.item, 7);

  steep.shop.restoreLevel(steep.item, bought.item.level);
  assert.equal(steep.item.level, 8);
  assert.equal(steep.item.price, bought.item.price);
});
