import assert from 'node:assert/strict';
import test from 'node:test';
import prestigeShop from '../src/shops/prestigeShop.js';
import { BRANCHES, PRESTIGE_NODES } from '../src/data/prestigeTree.js';
import { describePrestigeEffect } from '../src/prestigeEquations.js';
import CircleBoard from '../src/circleboard/CircleBoard.js';

const FUN = {
  'Head Start': { effectKey: 'headStart', maxLevel: 5, at1: 2, atMax: 10 },
  'Starting Cash': { effectKey: 'startingCash', maxLevel: 5, at1: 100, atMax: 100 * 5 ** 4 },
  'Lucky Clicks': { effectKey: 'luckyClicks', maxLevel: 5, at1: 0.05, atMax: 0.25 },
  'Golden Shapes': { effectKey: 'goldenChance', maxLevel: 5, at1: 0.02, atMax: 0.1 },
  'Long Boosts': { effectKey: 'boostDuration', maxLevel: 4, at1: 1.5, atMax: 3 },
};

test('the fun prestige upgrades exist, start cheap and do nothing at level 0', () => {
  const shop = new prestigeShop();
  for (const [name, spec] of Object.entries(FUN)) {
    const item = shop.getItem(name);
    assert.ok(item, name);
    assert.equal(item.effectKey, spec.effectKey);
    assert.equal(item.maxLevel, spec.maxLevel);
    assert.ok(item.price <= 50, `${name} is cheap to start`);
    const neutral = spec.effectKey === 'boostDuration' ? 1 : 0;
    assert.equal(item.valueEquation(0), neutral, `${name} level 0`);
    assert.ok(Math.abs(item.valueEquation(1) - spec.at1) < 1e-9, `${name} level 1`);
    assert.ok(Math.abs(item.valueEquation(spec.maxLevel) - spec.atMax) < 1e-9, `${name} max`);
    assert.notEqual(describePrestigeEffect(spec.effectKey, item.valueEquation(1)), String(item.valueEquation(1)));
  }
});

test('the fun upgrades sit on their own branch early in the tree', () => {
  assert.ok(BRANCHES.fun);
  const fun = PRESTIGE_NODES.filter((n) => n.branch === 'fun');
  assert.deepEqual(fun.map((n) => n.item).sort(), Object.keys(FUN).sort());
  const ids = new Set(PRESTIGE_NODES.map((n) => n.id));
  for (const node of fun) {
    for (const req of node.requires) assert.ok(ids.has(typeof req === 'string' ? req : req.id));
  }
});

test('golden shapes: with a 100% chance every new shape is gold and worth ×5', () => {
  const board = new CircleBoard({ getContext: () => ({}) });
  board.container = { x: 400, y: 400, radius: 375, thickness: 5 };
  board.goldenChance = 1;
  for (const shape of [board.createBall(), board.createSquare(), board.createTriangle()]) {
    assert.equal(shape.value, 5);
    assert.equal(shape.golden, true);
  }
  board.goldenChance = 0;
  assert.equal(board.createBall().value, 1);
});
