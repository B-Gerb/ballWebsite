import assert from 'node:assert/strict';
import test from 'node:test';
import baseUpgradeShop from '../src/shops/baseUpgradeShop.js';

test('a cosmic event puts the add-shape items back to level 1 at ×10 the starting price', () => {
  const shop = new baseUpgradeShop();
  shop.addSquaresToShop();
  shop.addTrianglesToShop();
  const [addBall] = shop.getItem('Add Ball');
  const [sizeMax] = shop.getItem('Increase Ball Size Range Max');
  shop.balance = 1e9;
  shop.buyItem(addBall, 20);
  shop.buyItem(sizeMax, 3);

  shop.resetAddShapeItems(10);
  assert.equal(addBall.level, 1);
  assert.equal(shop.itemCost(addBall, 1)[0], 10, 'starting price 1 × 10');
  assert.equal(shop.getItem('Add Square')[0].level, 1);
  assert.equal(shop.itemCost(shop.getItem('Add Triangle')[0], 1)[0], 10);
  assert.equal(sizeMax.level, 4, 'other upgrades are untouched');
  // Bulk and max buys use the same ×10 prices.
  assert.equal(shop.itemCost(addBall, 2)[0], 10 + (1 * 1.1 + 1) * 10);
  shop.balance = 25;
  assert.equal(shop.maxAffordable(addBall).count, 1);
});

test('a reset shop forgets the cosmic price multiplier', () => {
  const shop = new baseUpgradeShop();
  shop.resetAddShapeItems(100);
  shop.resetShop();
  assert.equal(shop.itemCost(shop.getItem('Add Ball')[0], 1)[0], 1);
});
