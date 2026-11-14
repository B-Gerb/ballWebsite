import assert from 'node:assert/strict';
import test from 'node:test';
import prestigeShop from '../src/shops/prestigeShop.js';
import {
    MINIMUM_RUN_POINTS,
    PRESTIGE_BASE_EXPONENT,
    basePrestigePoints,
    describePrestigeEffect,
    prestigeAward,
} from '../src/prestigeEquations.js';
import { BRANCHES, PRESTIGE_NODES } from '../src/data/prestigeTree.js';

const COSMIC = [
    { name: 'Event Horizon Theory', effectKey: 'blackHoleThreshold', maxLevel: 5, price: 5000, at: (l) => 1 - 0.1 * l },
    { name: 'Stellar Physics', effectKey: 'supernovaThreshold', maxLevel: 5, price: 5000, at: (l) => 1 - 0.1 * l },
    { name: 'Cosmic Dividend', effectKey: 'cosmicMultiplier', maxLevel: 5, price: 20000, at: (l) => 0.5 * l },
    { name: 'Skill Mentor', effectKey: 'skillPointCost', maxLevel: 5, price: 15000, at: (l) => 1 - 0.1 * l },
    { name: 'Grand Multiplier', effectKey: 'grandCurrency', maxLevel: 10, price: 50000, at: (l) => 1.5 ** l },
];

test('late-game cosmos upgrades exist with the server contract values', () => {
    const shop = new prestigeShop();
    for (const spec of COSMIC) {
        const item = shop.getItem(spec.name);
        assert.ok(item, `${spec.name} missing`);
        assert.equal(item.effectKey, spec.effectKey);
        assert.equal(item.maxLevel, spec.maxLevel);
        assert.equal(item.price, spec.price);
        for (const level of [0, 1, spec.maxLevel]) {
            assert.ok(
                Math.abs(item.valueEquation(level) - spec.at(level)) < 1e-9,
                `${spec.name} value at level ${level}`,
            );
        }
        const growth = item.priceEquation(item.price, 0) / item.price;
        assert.ok(growth >= 2.5 && growth <= 3, `${spec.name} grows ×${growth}`);
        assert.notEqual(describePrestigeEffect(spec.effectKey, item.valueEquation(1)), String(item.valueEquation(1)));
    }
    assert.ok(Math.abs(shop.getItem('Event Horizon Theory').valueEquation(5) - 0.5) < 1e-9);
    assert.ok(Math.abs(shop.getItem('Grand Multiplier').valueEquation(10) - 1.5 ** 10) < 1e-9);
});

test('cosmos tree nodes exist on their own branch and hang off late nodes', () => {
    assert.ok(BRANCHES.cosmos);
    const cosmos = PRESTIGE_NODES.filter((node) => node.branch === 'cosmos');
    assert.deepEqual(cosmos.map((node) => node.item).sort(), COSMIC.map((spec) => spec.name).sort());
    cosmos.forEach((node) => assert.ok(node.requires.length > 0, `${node.id} must not be a root`));
});

test('every prestige tree node matches a shop item and effectKey', () => {
    const shop = new prestigeShop();
    for (const node of PRESTIGE_NODES) {
        const item = shop.getItem(node.item ?? node.id);
        assert.ok(item, `${node.id} has no shop item "${node.item}"`);
        assert.equal(node.effectKey, item.effectKey, `${node.id} effectKey`);
    }
});

test('prestige base points are sublinear in run points', () => {
    assert.equal(PRESTIGE_BASE_EXPONENT, 0.8);
    assert.equal(MINIMUM_RUN_POINTS, 1000);
    assert.equal(basePrestigePoints(999), 0);
    assert.equal(basePrestigePoints(1000), 1);
    assert.equal(basePrestigePoints(1e6), 251);
    assert.equal(prestigeAward(999, 0, 1), 0);
    assert.equal(prestigeAward(1000, 0, 1), 1);
    assert.equal(prestigeAward(1e6, 0, 1), 251);
});

test('10-level upgrades use softened price growth', () => {
    const shop = new prestigeShop();
    const tenLevel = shop.items.filter((item) => item.maxLevel === 10 && item.effectKey !== 'grandCurrency');
    assert.ok(tenLevel.length > 10);
    for (const item of tenLevel) {
        const growth = item.priceEquation(item.price, 0) / item.price;
        assert.ok(growth >= 1.4 && growth <= 1.8, `${item.name} grows ×${growth}`);
    }
    const currency = shop.getItem('Global Currency Multiplier');
    shop.addBalance(1e12);
    assert.ok(shop.buyItemByName('Global Currency Multiplier', 1));
    assert.equal(currency.price, 100 * 1.7);
});
