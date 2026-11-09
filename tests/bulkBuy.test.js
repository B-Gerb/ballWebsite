import assert from 'node:assert/strict';
import test from 'node:test';
import baseUpgradeShop from '../src/shops/baseUpgradeShop.js';
import clickShop from '../src/shops/clickShop.js';

const buyOneAtATime = (makeShop, name, times) => {
  const shop = makeShop();
  shop.balance = 1e12;
  const item = shop.getItem(name);
  const target = Array.isArray(item) ? item[0] : item;
  let spent = 0;
  for (let i = 0; i < times; i++) {
    spent += shop.itemCost(target, 1)[0];
    assert.ok(shop.buyItem(target, 1));
  }
  return { spent, item: target };
};

const buyInBulk = (makeShop, name, times) => {
  const shop = makeShop();
  shop.balance = 1e12;
  const item = shop.getItem(name);
  const target = Array.isArray(item) ? item[0] : item;
  const spent = shop.itemCost(target, times)[0];
  assert.ok(shop.buyItem(target, times));
  return { spent, item: target };
};

const cases = [
  [() => new baseUpgradeShop(), 'Add Ball', 25],
  // (price + 10) ** 1.4 overflows to Infinity well before 25 levels.
  [() => new baseUpgradeShop(), 'Increase Ball Speed Min', 6],
  // Click-shop price formulas read `this.level`, so bulk pricing must
  // advance the level for every step, not reuse the starting level.
  [() => new clickShop(), 'Increase Click Value', 25],
  [() => new clickShop(), 'Temporary Speed Multiplier', 25],
];

for (const [makeShop, name, times] of cases) {
  test(`buying ${name} ×${times} costs the same as ${times} single buys`, () => {
    const single = buyOneAtATime(makeShop, name, times);
    const bulk = buyInBulk(makeShop, name, times);
    assert.ok(Number.isFinite(single.spent));
    assert.ok(Math.abs(bulk.spent - single.spent) <= 1e-9 * single.spent, `${bulk.spent} vs ${single.spent}`);
    assert.equal(bulk.item.level, single.item.level);
    assert.ok(Math.abs(bulk.item.price - single.item.price) <= 1e-9 * single.item.price);
  });
}

test('a bulk buy you cannot fully afford buys nothing', () => {
  const shop = new baseUpgradeShop();
  const item = shop.getItem('Add Ball')[0];
  shop.balance = shop.itemCost(item, 10)[0] - 0.01;
  const before = shop.balance;
  assert.equal(shop.buyItem(item, 10), false);
  assert.equal(shop.balance, before);
  assert.equal(item.level, 1);
});
