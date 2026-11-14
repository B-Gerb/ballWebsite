import assert from 'node:assert/strict';
import test from 'node:test';
import prestigeShop from '../src/shops/prestigeShop.js';
import SkillShop, { SKILLS_UNLOCK_COST } from '../src/shops/skillShop.js';
import { EMPTY_EFFECTS, SKILL_NODES } from '../src/data/skillTree.js';

const withPoints = (points) => {
  const shop = new prestigeShop();
  shop.balance = points;
  return shop;
};

const unlockedSkills = (extraPoints = 0) => {
  const prestige = withPoints(SKILLS_UNLOCK_COST + extraPoints);
  const skills = new SkillShop();
  assert.ok(skills.unlock(prestige));
  return { skills, prestige };
};

test('unlocking skills costs a huge amount of prestige points', () => {
  assert.equal(SKILLS_UNLOCK_COST, 25000);
  const skills = new SkillShop();

  const poor = withPoints(SKILLS_UNLOCK_COST - 1);
  assert.equal(skills.unlock(poor), false);
  assert.equal(poor.balance, SKILLS_UNLOCK_COST - 1);
  assert.equal(skills.unlocked, false);

  const rich = withPoints(SKILLS_UNLOCK_COST + 10);
  assert.equal(skills.unlock(rich), true);
  assert.equal(rich.balance, 10);
  assert.equal(skills.unlocked, true);
  assert.equal(skills.unlock(rich), false, 'only unlocks once');
});

test('skill points are bought with prestige points and get pricier', () => {
  const locked = new SkillShop();
  assert.equal(locked.buySkillPoint(withPoints(1e9)), false, 'needs skills unlocked first');

  const { skills, prestige } = unlockedSkills(7500);
  assert.equal(skills.skillPointPrice(), 2500);
  assert.ok(skills.buySkillPoint(prestige));
  assert.equal(skills.skillPoints, 1);
  assert.equal(prestige.balance, 5000);
  assert.equal(skills.skillPointPrice(), 5000);
  assert.ok(skills.buySkillPoint(prestige));
  assert.equal(prestige.balance, 0);
  assert.equal(skills.buySkillPoint(prestige), false);
  assert.equal(skills.skillPoints, 2);
});

test('the tree has fusion, collision click and chain lightning, each with 3 choices', () => {
  assert.deepEqual(SKILL_NODES.map((n) => n.id), ['shape-fusion', 'collision-click', 'chain-lightning']);
  for (const node of SKILL_NODES) assert.equal(node.choices.length, 3, node.id);
});

test('a skill point unlocks a skill once, and that is all it costs', () => {
  const { skills, prestige } = unlockedSkills(2500);
  assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'skillPoints', amount: 1 });
  assert.equal(skills.buy('shape-fusion'), false, 'no skill point yet');

  skills.buySkillPoint(prestige);
  assert.ok(skills.buy('shape-fusion'));
  assert.ok(skills.isSkillUnlocked('shape-fusion'));
  assert.equal(skills.skillPoints, 0);
  assert.equal(skills.nextCost('shape-fusion'), null, 'nothing more to buy');
  assert.equal(skills.buy('shape-fusion'), false);
  assert.deepEqual(skills.unlockedSkillIds(), ['shape-fusion']);
});

test('unlocked skills give their base effect and stack level-bar picks on top', () => {
  const { skills, prestige } = unlockedSkills(2500 + 5000);
  assert.deepEqual(skills.effects(), EMPTY_EFFECTS);

  skills.buySkillPoint(prestige);
  skills.buy('shape-fusion');
  assert.equal(skills.effects().fusionChance, 0.005);
  assert.equal(skills.effects({ 'fusion-chance': 2 }).fusionChance, 0.01);

  // Picks for a skill that isn't unlocked do nothing.
  assert.equal(skills.effects({ 'click-chance': 5 }).collisionClickChance, 0);
  skills.buySkillPoint(prestige);
  skills.buy('collision-click');
  assert.ok(Math.abs(skills.effects({ 'click-chance': 2 }).collisionClickChance - 0.02) < 1e-12);
});

test('skills that require another skill stay locked until it is unlocked', () => {
  const tree = [
    { id: 'root', requires: [], unlockCost: 1, base: {}, choices: [] },
    { id: 'leaf', requires: ['root'], unlockCost: 1, base: {}, choices: [] },
  ];
  const prestige = withPoints(SKILLS_UNLOCK_COST + 1e9);
  const skills = new SkillShop(tree);
  skills.unlock(prestige);
  skills.buySkillPoint(prestige);
  skills.buySkillPoint(prestige);
  assert.equal(skills.isAvailable('leaf'), false);
  assert.equal(skills.buy('leaf'), false);
  assert.ok(skills.buy('root'));
  assert.ok(skills.isAvailable('leaf'));
  assert.ok(skills.buy('leaf'));
});

test('skill progress survives a save, and old collision-bought levels mean "unlocked"', () => {
  const { skills, prestige } = unlockedSkills(2500);
  skills.buySkillPoint(prestige);
  skills.buy('shape-fusion');

  const restored = new SkillShop();
  restored.load(JSON.parse(JSON.stringify(skills.toJSON())));
  assert.equal(restored.unlocked, true);
  assert.ok(restored.isSkillUnlocked('shape-fusion'));
  assert.equal(restored.skillPointPrice(), 5000);

  const old = new SkillShop();
  old.load({ unlocked: true, skillPoints: -4, collisionBank: 1234, skills: { 'shape-fusion': 7, ghost: 3, 'chain-lightning': 0 } });
  assert.equal(old.skillPoints, 0);
  assert.equal(old.level('shape-fusion'), 1);
  assert.equal(old.isSkillUnlocked('chain-lightning'), false);
  assert.equal(old.level('ghost'), 0);
});
