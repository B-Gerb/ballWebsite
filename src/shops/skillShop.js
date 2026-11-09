import { SKILL_NODES } from '../data/skillTree.js';
import { normalizeRequirement } from '../components/whiteboard/graphLayout.js';

/** One-time prestige-point price of opening the Skills tab. */
export const SKILLS_UNLOCK_COST = 25000;
/** Prestige-point price of the first skill point; doubles every purchase. */
export const SKILL_POINT_BASE_PRICE = 2500;
export const SKILL_POINT_PRICE_GROWTH = 2;

const nonNegative = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const nonNegativeInteger = (value) => Math.floor(nonNegative(value));

/**
 * Skill progress. Spends prestige points through the prestige shop you pass
 * in, so it never holds a second copy of that balance.
 */
class SkillShop {
  constructor(nodes = SKILL_NODES) {
    this.nodes = nodes;
    this.byId = new Map(nodes.map((n) => [n.id, n]));
    this.reset();
  }

  reset() {
    this.unlocked = false;
    this.skillPoints = 0;
    this.skillPointsBought = 0;
    this.collisionBank = 0;
    this.levels = {};
  }

  level(id) {
    return this.levels[id] ?? 0;
  }

  unlock(prestigeShop) {
    if (this.unlocked || prestigeShop.getBalance() < SKILLS_UNLOCK_COST) return false;
    prestigeShop.removeBalance(SKILLS_UNLOCK_COST);
    this.unlocked = true;
    return true;
  }

  skillPointPrice() {
    return SKILL_POINT_BASE_PRICE * SKILL_POINT_PRICE_GROWTH ** this.skillPointsBought;
  }

  buySkillPoint(prestigeShop) {
    const price = this.skillPointPrice();
    if (!this.unlocked || prestigeShop.getBalance() < price) return false;
    prestigeShop.removeBalance(price);
    this.skillPointsBought += 1;
    this.skillPoints += 1;
    return true;
  }

  addCollisions(amount) {
    this.collisionBank += nonNegative(amount);
  }

  /** Every requirement is met (a bare id means "at least level 1"). */
  isAvailable(id) {
    const node = this.byId.get(id);
    if (!node) return false;
    return (node.requires ?? []).map(normalizeRequirement).every((req) => this.level(req.id) >= req.level);
  }

  /** What the next level costs, or null when maxed / unknown. */
  nextCost(id) {
    const node = this.byId.get(id);
    if (!node) return null;
    const level = this.level(id);
    if (level >= node.maxLevel) return null;
    return level === 0
      ? { currency: 'skillPoints', amount: node.unlockCost ?? 1 }
      : { currency: 'collisions', amount: node.collisionCost(level) };
  }

  canAfford(cost) {
    if (!cost) return false;
    return cost.currency === 'skillPoints'
      ? this.skillPoints >= cost.amount
      : this.collisionBank >= cost.amount;
  }

  /** Unlock (skill points) or level up (collisions) a skill. */
  buy(id) {
    const cost = this.nextCost(id);
    if (!this.unlocked || !this.isAvailable(id) || !this.canAfford(cost)) return false;
    if (cost.currency === 'skillPoints') this.skillPoints -= cost.amount;
    else this.collisionBank -= cost.amount;
    this.levels[id] = this.level(id) + 1;
    return true;
  }

  /** Combined effects of every skill at its current level. */
  effects() {
    const total = { fusionChance: 0 };
    for (const node of this.nodes) Object.assign(total, node.effect(this.level(node.id)));
    return total;
  }

  toJSON() {
    return {
      unlocked: this.unlocked,
      skillPoints: this.skillPoints,
      skillPointsBought: this.skillPointsBought,
      collisionBank: this.collisionBank,
      skills: { ...this.levels },
    };
  }

  load(saved) {
    this.reset();
    if (!saved || typeof saved !== 'object') return;
    this.unlocked = saved.unlocked === true;
    this.skillPoints = nonNegativeInteger(saved.skillPoints);
    this.skillPointsBought = nonNegativeInteger(saved.skillPointsBought);
    this.collisionBank = nonNegative(saved.collisionBank);
    for (const [id, level] of Object.entries(saved.skills ?? {})) {
      const node = this.byId.get(id);
      if (node) this.levels[id] = Math.min(node.maxLevel, nonNegativeInteger(level));
    }
  }
}

export default SkillShop;
