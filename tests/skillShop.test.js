import assert from 'node:assert/strict';
import test from 'node:test';
import prestigeShop from '../src/shops/prestigeShop.js';
import SkillShop, { SKILLS_UNLOCK_COST } from '../src/shops/skillShop.js';

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

test('a skill is unlocked with a skill point, then levelled with collisions', () => {
  const { skills, prestige } = unlockedSkills(2500);
  assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'skillPoints', amount: 1 });
  assert.equal(skills.buy('shape-fusion'), false, 'no skill point yet');

  skills.buySkillPoint(prestige);
  assert.ok(skills.buy('shape-fusion'));
  assert.equal(skills.level('shape-fusion'), 1);
  assert.equal(skills.skillPoints, 0);

  assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'collisions', amount: 100000 });
  skills.addCollisions(99999);
  assert.equal(skills.buy('shape-fusion'), false);
  skills.addCollisions(1);
  assert.ok(skills.buy('shape-fusion'));
  assert.equal(skills.level('shape-fusion'), 2);
  assert.equal(skills.collisionBank, 0);
  assert.deepEqual(skills.nextCost('shape-fusion'), { currency: 'collisions', amount: 180000 });
});

test('fusion chance starts slight and grows with the skill level', () => {
  const { skills, prestige } = unlockedSkills(2500);
  assert.equal(skills.effects().fusionChance, 0);
  skills.buySkillPoint(prestige);
  skills.buy('shape-fusion');
  assert.equal(skills.effects().fusionChance, 0.005);
  skills.addCollisions(100000);
  skills.buy('shape-fusion');
  assert.equal(skills.effects().fusionChance, 0.0075);
});

test('skills that require another skill stay locked until it is levelled', () => {
  const tree = [
    { id: 'root', requires: [], maxLevel: 5, unlockCost: 1, collisionCost: () => 10, effect: () => ({}) },
    { id: 'leaf', requires: [{ id: 'root', level: 2 }], maxLevel: 1, unlockCost: 1, collisionCost: () => 10, effect: () => ({}) },
  ];
  const prestige = withPoints(SKILLS_UNLOCK_COST + 1e9);
  const skills = new SkillShop(tree);
  skills.unlock(prestige);
  skills.buySkillPoint(prestige);
  skills.buySkillPoint(prestige);
  assert.ok(skills.buy('root'));
  assert.equal(skills.isAvailable('leaf'), false);
  assert.equal(skills.buy('leaf'), false);
  skills.addCollisions(10);
  skills.buy('root');
  assert.ok(skills.isAvailable('leaf'));
  assert.ok(skills.buy('leaf'));
});

test('skill progress survives a save and ignores corrupted values', () => {
  const { skills, prestige } = unlockedSkills(2500);
  skills.buySkillPoint(prestige);
  skills.buy('shape-fusion');
  skills.addCollisions(1234);

  const restored = new SkillShop();
  restored.load(JSON.parse(JSON.stringify(skills.toJSON())));
  assert.equal(restored.unlocked, true);
  assert.equal(restored.level('shape-fusion'), 1);
  assert.equal(restored.collisionBank, 1234);
  assert.equal(restored.skillPointPrice(), 5000);

  const junk = new SkillShop();
  junk.load({ unlocked: 'yes', skillPoints: -4, collisionBank: NaN, skills: { 'shape-fusion': 999, ghost: 3 } });
  assert.equal(junk.skillPoints, 0);
  assert.equal(junk.collisionBank, 0);
  assert.equal(junk.level('shape-fusion'), 20, 'clamped to max level');
  assert.equal(junk.level('ghost'), 0);
});
