import assert from 'node:assert/strict';
import test from 'node:test';
import Cosmos from '../src/shops/cosmos.js';

test('a black hole gives 1 black hole, ×9 money, ÷10 mass for new shapes and ×10 add-shape prices', () => {
  const cosmos = new Cosmos();
  cosmos.record('blackHole');
  assert.equal(cosmos.balance.blackHoles, 1);
  assert.equal(cosmos.balance.supernovas, 0);
  assert.equal(cosmos.currencyMultiplier, 9);
  assert.equal(cosmos.spawnMassScale, 0.1);
  assert.equal(cosmos.spawnSpeedScale, 1);
  assert.equal(cosmos.addShapePriceMultiplier, 10);
  assert.equal(cosmos.discovered, true);
});

test('upgrades cost their own currency and get pricier each level', () => {
  const cosmos = new Cosmos();
  cosmos.record('blackHole');
  cosmos.record('blackHole');
  cosmos.record('blackHole');
  assert.equal(cosmos.buy('accretion-disk'), true); // costs 1
  assert.equal(cosmos.buy('accretion-disk'), true); // costs 2
  assert.equal(cosmos.balance.blackHoles, 0);
  assert.equal(cosmos.buy('accretion-disk'), false, 'cannot afford level 3');
  assert.equal(cosmos.buy('shockwave'), false, 'supernova upgrades need supernovas');
  assert.equal(cosmos.level('accretion-disk'), 2);
});

test('upgrades that need both currencies stay locked until the run has had one of each event', () => {
  const cosmos = new Cosmos();
  cosmos.record('blackHole');
  cosmos.record('blackHole');
  assert.equal(cosmos.isAvailable('quasar'), false);
  assert.equal(cosmos.buy('quasar'), false);
  cosmos.record('supernova');
  assert.equal(cosmos.isAvailable('quasar'), true);
  assert.deepEqual(cosmos.cost('quasar'), { blackHoles: 1, supernovas: 1 });
  assert.equal(cosmos.buy('quasar'), true);
  assert.deepEqual(cosmos.balance, { blackHoles: 1, supernovas: 0 });
});

test('upgrades stop at their max level', () => {
  const cosmos = new Cosmos();
  for (let i = 0; i < 10; i++) cosmos.record('supernova');
  assert.equal(cosmos.buy('stardust'), true);
  assert.equal(cosmos.buy('stardust'), true);
  assert.equal(cosmos.buy('stardust'), true);
  assert.equal(cosmos.cost('stardust'), null);
  assert.equal(cosmos.buy('stardust'), false);
  assert.equal(cosmos.balance.supernovas, 4);
});

test('Quasar and Neutron Star only change events that happen after they are bought', () => {
  const cosmos = new Cosmos();
  for (const kind of ['blackHole', 'supernova', 'blackHole', 'supernova']) cosmos.record(kind);
  assert.equal(cosmos.currencyMultiplier, 9 ** 4);
  assert.equal(cosmos.buy('quasar'), true);
  assert.equal(cosmos.buy('neutron-star'), true);
  assert.equal(cosmos.currencyMultiplier, 9 ** 4, 'past events keep their ×9');
  cosmos.record('blackHole');
  assert.equal(cosmos.currencyMultiplier, 9 ** 4 * 10);
  assert.equal(cosmos.addShapePriceMultiplier, 10 ** 4 * 8);
});

test('outside bonuses (skills, prestige) add to the ×9 of an event', () => {
  const cosmos = new Cosmos();
  cosmos.record('supernova', { bonus: 0.5 });
  assert.equal(cosmos.currencyMultiplier, 9.5);
  assert.equal(cosmos.spawnSpeedScale, 0.1);
  assert.equal(cosmos.spawnMassScale, 1);
});

test('Event Horizon halves the black hole mass; outside cuts and multipliers stack on top', () => {
  const cosmos = new Cosmos();
  assert.equal(cosmos.blackHoleThreshold(), 100000);
  cosmos.record('blackHole');
  cosmos.buy('event-horizon');
  assert.equal(cosmos.blackHoleThreshold(), 50000);
  // A 10% skill cut and a ×0.8 prestige multiplier.
  assert.ok(Math.abs(cosmos.blackHoleThreshold({ cut: 0.1, multiplier: 0.8 }) - 36000) < 1e-6);
  // Cuts are capped at 90%.
  assert.ok(Math.abs(cosmos.blackHoleThreshold({ cut: 5 }) - 5000) < 1e-6);
});

test('Chain Reaction lowers the supernova speed', () => {
  const cosmos = new Cosmos();
  assert.equal(cosmos.supernovaThreshold(), 60);
  cosmos.record('supernova');
  cosmos.buy('chain-reaction');
  assert.ok(Math.abs(cosmos.supernovaThreshold() - 36) < 1e-9);
});

test('a save restores the run, and prestige clears everything but the discovered tab', () => {
  const cosmos = new Cosmos();
  for (const kind of ['blackHole', 'supernova', 'blackHole']) cosmos.record(kind);
  cosmos.buy('quasar');
  const copy = new Cosmos();
  copy.load(JSON.parse(JSON.stringify(cosmos.toJSON())));
  assert.deepEqual(copy.toJSON(), cosmos.toJSON());
  assert.equal(copy.level('quasar'), 1);
  assert.equal(copy.currencyMultiplier, 729);

  copy.reset();
  assert.equal(copy.discovered, true);
  assert.deepEqual(copy.balance, { blackHoles: 0, supernovas: 0 });
  assert.equal(copy.currencyMultiplier, 1);
  assert.equal(copy.level('quasar'), 0);
});

test('a corrupt or missing save loads as a fresh cosmos', () => {
  const cosmos = new Cosmos();
  cosmos.load({ counts: { blackHoles: -3 }, balance: { supernovas: 'x' }, currencyMultiplier: NaN,
    levels: { quasar: 99, nope: 2 } });
  assert.deepEqual(cosmos.counts, { blackHoles: 0, supernovas: 0 });
  assert.equal(cosmos.currencyMultiplier, 1);
  assert.equal(cosmos.level('quasar'), 3, 'clamped to max level');
  assert.equal(cosmos.level('nope'), 0);
  cosmos.load(undefined);
  assert.equal(cosmos.level('quasar'), 0);
});

test('the next event\'s money multiplier and price jump reflect Quasar and Neutron Star', () => {
  const cosmos = new Cosmos();
  assert.equal(cosmos.nextEventMultiplier(), 9);
  assert.equal(cosmos.nextAddShapePriceJump(), 10);
  cosmos.record('blackHole');
  cosmos.record('supernova');
  cosmos.buy('quasar');
  assert.equal(cosmos.nextEventMultiplier(0.5), 10.5);
  assert.equal(cosmos.nextAddShapePriceJump(), 10);
});

test('the money multiplier never overflows to Infinity', () => {
  const cosmos = new Cosmos();
  for (let i = 0; i < 400; i++) cosmos.record(i % 2 ? 'blackHole' : 'supernova');
  assert.ok(Number.isFinite(cosmos.currencyMultiplier));
  assert.ok(cosmos.currencyMultiplier > 1e299);
  const copy = new Cosmos();
  copy.load(JSON.parse(JSON.stringify(cosmos.toJSON())));
  assert.equal(copy.currencyMultiplier, cosmos.currencyMultiplier, 'survives a save');
});
