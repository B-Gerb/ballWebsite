import assert from 'node:assert/strict';
import test from 'node:test';
import prestigeShop from '../src/shops/prestigeShop.js';
import SkillShop, {
  MAX_RANK,
  SKILLS_UNLOCK_COST,
  SKILL_POINT_BASE_PRICE,
  SKILL_POINT_PRICE_GROWTH,
} from '../src/shops/skillShop.js';
import { EMPTY_EFFECTS, SKILL_BRANCHES, SKILL_CHOICES, SKILL_NODES, skillEffects } from '../src/data/skillTree.js';

const close = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: ${actual} vs ${expected}`);

/** An unlocked skill shop with `points` skill points to spend. */
const shopWith = (points, nodes) => {
  const skills = new SkillShop(nodes);
  skills.unlocked = true;
  skills.skillPoints = points;
  return skills;
};

test('ranking up costs rank + 1 skill points, up to rank 5', () => {
  assert.equal(MAX_RANK, 5);
  const skills = shopWith(1 + 2 + 3 + 4 + 5 + 10);
  assert.equal(skills.rank('shape-fusion'), 0);
  assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'skillPoints', amount: 1 });

  const expected = [1, 2, 3, 4, 5];
  for (const [i, amount] of expected.entries()) {
    assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'skillPoints', amount }, `rank ${i}`);
    const before = skills.skillPoints;
    assert.ok(skills.buy('shape-fusion'));
    assert.equal(skills.skillPoints, before - amount);
    assert.equal(skills.rank('shape-fusion'), i + 1);
    assert.ok(skills.isSkillUnlocked('shape-fusion'));
  }
  assert.equal(skills.nextCost('shape-fusion'), null, 'max rank');
  assert.equal(skills.buy('shape-fusion'), false);
  assert.equal(skills.skillPoints, 10);
});

test('rank-ups fail without enough skill points', () => {
  const skills = shopWith(2);
  assert.ok(skills.buy('shape-fusion'));
  assert.equal(skills.buy('shape-fusion'), false, 'rank 2 costs 2, only 1 left');
  assert.equal(skills.rank('shape-fusion'), 1);
});

test('a node can override its rank-up costs', () => {
  const tree = [{ id: 'x', requires: [], unlockCost: 3, rankCosts: [7, 8, 9, 10], base: {}, choices: [] }];
  const skills = shopWith(100, tree);
  assert.deepEqual(skills.nextCost('x'), { currency: 'skillPoints', amount: 3 });
  skills.buy('x');
  assert.deepEqual(skills.nextCost('x'), { currency: 'skillPoints', amount: 7 });
  skills.buy('x');
  assert.deepEqual(skills.nextCost('x'), { currency: 'skillPoints', amount: 8 });
});

test('rank multiplies the base effect and scales level-bar choices by +25% per rank', () => {
  const skills = shopWith(100);
  skills.buy('shape-fusion');
  close(skills.effects().fusionChance, 0.005, 'rank 1 base');
  close(skills.effects({ 'fusion-chance': 2 }).fusionChance, 0.005 + 0.005, 'rank 1 picks');

  skills.buy('shape-fusion');
  skills.buy('shape-fusion'); // rank 3
  close(skills.effects().fusionChance, 0.015, 'rank 3 base');
  close(skills.effects({ 'fusion-chance': 2 }).fusionChance, 0.015 + 0.005 * 1.5, 'rank 3 picks');
});

test('skillEffects accepts a rank function, and booleans still mean rank 1 / 0', () => {
  close(skillEffects(() => true).fusionChance, 0.005, 'true = rank 1');
  assert.deepEqual(skillEffects(() => false), EMPTY_EFFECTS);
  close(skillEffects((id) => (id === 'shape-fusion' ? 2 : 0)).fusionChance, 0.01, 'rank 2');
  assert.equal(skillEffects(() => 0).fusionChance, 0);
});

test('view(id) gives the UI everything about one node', () => {
  const skills = shopWith(3);
  assert.deepEqual(skills.view('shape-fusion'), {
    id: 'shape-fusion',
    unlocked: false,
    rank: 0,
    maxRank: MAX_RANK,
    available: true,
    cost: { currency: 'skillPoints', amount: 1 },
    canAfford: true,
  });
  skills.buy('shape-fusion');
  skills.buy('shape-fusion');
  assert.deepEqual(skills.view('shape-fusion'), {
    id: 'shape-fusion',
    unlocked: true,
    rank: 2,
    maxRank: MAX_RANK,
    available: true,
    cost: { currency: 'skillPoints', amount: 3 },
    canAfford: false,
  });
  assert.equal(skills.view('gravity-well').available, true, 'Shape Fusion is unlocked');
  assert.equal(skills.view('stellar-forge').available, false, 'Chain Lightning is not');
});

test('ranks survive a save; old saves with high levels load as rank 1', () => {
  const skills = shopWith(10);
  skills.buy('shape-fusion');
  skills.buy('shape-fusion');
  skills.buy('shape-fusion');
  skills.buy('chain-lightning');
  const saved = JSON.parse(JSON.stringify(skills.toJSON()));
  assert.deepEqual(saved.skills, { 'shape-fusion': 1, 'chain-lightning': 1 });
  assert.deepEqual(saved.ranks, { 'shape-fusion': 3, 'chain-lightning': 1 });

  const restored = new SkillShop();
  restored.load(saved);
  assert.equal(restored.rank('shape-fusion'), 3);
  assert.equal(restored.rank('chain-lightning'), 1);

  const old = new SkillShop();
  old.load({ unlocked: true, skills: { 'shape-fusion': 20 } });
  assert.equal(old.rank('shape-fusion'), 1);
  assert.ok(old.isSkillUnlocked('shape-fusion'));

  const weird = new SkillShop();
  weird.load({ unlocked: true, skills: { 'shape-fusion': 1 }, ranks: { 'shape-fusion': 99, 'chain-lightning': 4, ghost: 2 } });
  assert.equal(weird.rank('shape-fusion'), MAX_RANK, 'clamped');
  assert.equal(weird.rank('chain-lightning'), 0, 'ranks only apply to unlocked skills');
  assert.equal(weird.rank('ghost'), 0);
});

test('skill points grow ×1.75 in price, and a discount multiplier lowers it', () => {
  assert.equal(SKILL_POINT_BASE_PRICE, 2500);
  assert.equal(SKILL_POINT_PRICE_GROWTH, 1.75);
  const skills = new SkillShop();
  skills.unlocked = true;
  assert.equal(skills.skillPointPrice(), 2500);
  assert.equal(skills.skillPointPrice(0.7), 1750);
  skills.skillPointsBought = 3;
  assert.equal(skills.skillPointPrice(), Math.round(2500 * 1.75 ** 3));
  assert.ok(Number.isInteger(skills.skillPointPrice(0.7)));

  const prestige = new prestigeShop();
  prestige.balance = 1750;
  skills.skillPointsBought = 0;
  assert.equal(skills.buySkillPoint(prestige), false, 'full price is 2500');
  assert.ok(skills.buySkillPoint(prestige, 0.7));
  assert.equal(prestige.balance, 0);
  assert.equal(skills.skillPoints, 1);
  assert.ok(SKILLS_UNLOCK_COST > 0);
});

test('cosmic skills sit in the Cosmos branch and require their parent skill', () => {
  assert.deepEqual(SKILL_BRANCHES.cosmos, { label: 'Cosmos', color: '#a78bfa' });
  const byId = new Map(SKILL_NODES.map((n) => [n.id, n]));
  const well = byId.get('gravity-well');
  const forge = byId.get('stellar-forge');
  assert.deepEqual(well.requires, ['shape-fusion']);
  assert.deepEqual(forge.requires, ['chain-lightning']);
  for (const node of [well, forge]) {
    assert.equal(node.branch, 'cosmos');
    assert.equal(node.unlockCost, 3);
    assert.equal(node.choices.length, 3);
  }

  const skills = shopWith(10);
  assert.equal(skills.buy('gravity-well'), false, 'needs Shape Fusion');
  skills.buy('shape-fusion');
  assert.ok(skills.buy('gravity-well'));
  assert.equal(skills.skillPoints, 6);
  close(skills.effects().blackHoleThresholdCut, 0.1, 'gravity well base');
  close(skills.effects({ 'dense-matter': 2 }).spawnMassBonus, 0.2, 'dense matter');
  close(skills.effects({ singularity: 1 }).cosmicMultiplierBonus, 0.1, 'singularity');

  skills.buy('chain-lightning');
  skills.buy('stellar-forge');
  close(skills.effects().supernovaThresholdCut, 0.1, 'stellar forge base');
  close(skills.effects({ 'kinetic-core': 2 }).spawnSpeedBonus, 0.1, 'kinetic core');
});

test('new effect keys default to 0, and choice ids are globally unique', () => {
  for (const key of ['blackHoleThresholdCut', 'supernovaThresholdCut', 'cosmicMultiplierBonus', 'spawnMassBonus', 'spawnSpeedBonus']) {
    assert.equal(EMPTY_EFFECTS[key], 0, key);
  }
  const ids = SKILL_CHOICES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('resetting skills refunds every skill point spent on unlocks and ranks', () => {
  const shop = new SkillShop();
  shop.unlocked = true;
  shop.skillPoints = 20;
  assert.ok(shop.buy('shape-fusion')); // 1
  assert.ok(shop.buy('shape-fusion')); // rank 2: 2
  assert.ok(shop.buy('shape-fusion')); // rank 3: 3
  assert.ok(shop.buy('gravity-well')); // needs shape-fusion: 3
  assert.equal(shop.skillPoints, 20 - 9);
  assert.equal(shop.spentSkillPoints(), 9);
  shop.skillPointsBought = 4;
  const priceBefore = shop.skillPointPrice();

  assert.equal(shop.resetSkills(), 9);
  assert.equal(shop.skillPoints, 20);
  assert.equal(shop.spentSkillPoints(), 0);
  assert.deepEqual(shop.unlockedSkillIds(), []);
  assert.equal(shop.skillPointPrice(), priceBefore, 'buying skill points does not get cheaper');
  assert.equal(shop.resetSkills(), 0, 'nothing to refund twice');
});
