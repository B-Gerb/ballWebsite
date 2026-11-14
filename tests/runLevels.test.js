import assert from 'node:assert/strict';
import test from 'node:test';
import RunLevels, { LEVEL_XP_BASE, LEVEL_XP_GROWTH, OFFER_SIZE } from '../src/shops/runLevels.js';

const ALL = ['shape-fusion', 'collision-click', 'chain-lightning'];
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('collisions fill the bar; each level needs more and banks a pick', () => {
  const run = new RunLevels();
  assert.equal(run.xpToNext(), LEVEL_XP_BASE);
  assert.equal(run.addXp(LEVEL_XP_BASE - 1), 0);
  assert.equal(run.addXp(1), 1);
  assert.equal(run.level, 1);
  assert.equal(run.xp, 0);
  assert.equal(run.pendingPicks, 1);
  assert.equal(run.xpToNext(), Math.round(LEVEL_XP_BASE * LEVEL_XP_GROWTH));

  // One big chunk can cross several levels at once.
  const gained = run.addXp(run.xpToNext() + run.xpToNext(2) + 5);
  assert.equal(gained, 2);
  assert.equal(run.pendingPicks, 3);
  assert.equal(run.xp, 5);
});

test('no offer until a pick is waiting; offers draw distinct choices from unlocked skills only', () => {
  const run = new RunLevels({ rng: seq(0.99, 0, 0.5) });
  assert.equal(run.currentOffer(ALL), null);
  run.addXp(LEVEL_XP_BASE);

  const offer = run.currentOffer(['chain-lightning']);
  assert.equal(offer.length, OFFER_SIZE);
  assert.equal(new Set(offer).size, OFFER_SIZE);
  assert.deepEqual([...offer].sort(), ['lightning-chain', 'lightning-chance', 'lightning-charge']);
});

test('the offer is kept until you choose (reopening never rerolls)', () => {
  const run = new RunLevels();
  run.addXp(LEVEL_XP_BASE);
  const first = run.currentOffer(ALL);
  assert.deepEqual(run.currentOffer(ALL), first);

  const restored = new RunLevels();
  restored.load(JSON.parse(JSON.stringify(run.toJSON())));
  assert.deepEqual(restored.currentOffer(ALL), first);
});

test('choosing stacks the upgrade, spends the pick and only accepts offered ids', () => {
  const run = new RunLevels();
  run.addXp(LEVEL_XP_BASE);
  const offer = run.currentOffer(ALL);
  const notOffered = ['fusion-chance', 'click-chance', 'lightning-chance', 'boost-time'].find((id) => !offer.includes(id));
  assert.equal(run.choose(notOffered, ALL), false);

  assert.ok(run.choose(offer[0], ALL));
  assert.equal(run.stacks(offer[0]), 1);
  assert.equal(run.pendingPicks, 0);
  assert.equal(run.currentOffer(ALL), null);
  assert.equal(run.choose(offer[1], ALL), false, 'no pick left');
});

test('maxed choices leave the pool; an empty pool offers nothing', () => {
  const run = new RunLevels({
    choices: [{ id: 'only', skillId: 's', maxStacks: 1, effect: () => ({}) }],
  });
  run.addXp(LEVEL_XP_BASE + run.xpToNext(1));
  assert.deepEqual(run.currentOffer(['s']), ['only']);
  assert.ok(run.choose('only', ['s']));
  assert.deepEqual(run.currentOffer(['s']), []);
});

test('a prestige reset clears level, xp and picks; junk saves are cleaned', () => {
  const run = new RunLevels();
  run.addXp(LEVEL_XP_BASE * 3);
  run.choose(run.currentOffer(ALL)[0], ALL);
  run.reset();
  assert.deepEqual(run.toJSON(), { level: 0, xp: 0, pendingPicks: 0, offer: null, picks: {} });

  run.load({ level: -2, xp: NaN, pendingPicks: 2.7, offer: ['ghost', 'fusion-chance'], picks: { 'fusion-chance': 999, ghost: 1 } });
  assert.equal(run.level, 0);
  assert.equal(run.xp, 0);
  assert.equal(run.pendingPicks, 2);
  assert.deepEqual(run.offer, ['fusion-chance']);
  assert.deepEqual(run.picks, { 'fusion-chance': 20 });
});
