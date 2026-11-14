import { SKILL_NODES, skillEffects } from '../data/skillTree.js';
import { normalizeRequirement } from '../components/whiteboard/graphLayout.js';

/** One-time prestige-point price of opening the Skills tab. */
export const SKILLS_UNLOCK_COST = 25000;
/** Prestige-point price of the first skill point; doubles every purchase. */
export const SKILL_POINT_BASE_PRICE = 2500;
export const SKILL_POINT_PRICE_GROWTH = 2;

const nonNegative = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const nonNegativeInteger = (value) => Math.floor(nonNegative(value));

/**
 * Permanent skill progress: which skills are unlocked. Spends prestige points
 * through the prestige shop you pass in, so it never holds a second copy of
 * that balance. Run-only upgrades live in `RunLevels`.
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
    this.levels = {};
  }

  /** 1 when the skill is unlocked, else 0 (kept as a level for `requires`). */
  level(id) {
    return this.levels[id] ?? 0;
  }

  isSkillUnlocked(id) {
    return this.level(id) > 0;
  }

  unlockedSkillIds() {
    return this.nodes.filter((n) => this.isSkillUnlocked(n.id)).map((n) => n.id);
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

  /** Every requirement is met (a bare id means "unlocked"). */
  isAvailable(id) {
    const node = this.byId.get(id);
    if (!node) return false;
    return (node.requires ?? []).map(normalizeRequirement).every((req) => this.level(req.id) >= req.level);
  }

  /** Skill points needed to unlock, or null when already unlocked / unknown. */
  nextCost(id) {
    const node = this.byId.get(id);
    if (!node || this.isSkillUnlocked(id)) return null;
    return { currency: 'skillPoints', amount: node.unlockCost ?? 1 };
  }

  canAfford(cost) {
    return Boolean(cost) && this.skillPoints >= cost.amount;
  }

  /** Unlock a skill with skill points. */
  buy(id) {
    const cost = this.nextCost(id);
    if (!this.unlocked || !this.isAvailable(id) || !this.canAfford(cost)) return false;
    this.skillPoints -= cost.amount;
    this.levels[id] = 1;
    return true;
  }

  /** Base effects of unlocked skills plus this run's level-bar picks. */
  effects(picks = {}) {
    return skillEffects((id) => this.isSkillUnlocked(id), picks, this.nodes);
  }

  toJSON() {
    return {
      unlocked: this.unlocked,
      skillPoints: this.skillPoints,
      skillPointsBought: this.skillPointsBought,
      skills: { ...this.levels },
    };
  }

  load(saved) {
    this.reset();
    if (!saved || typeof saved !== 'object') return;
    this.unlocked = saved.unlocked === true;
    this.skillPoints = nonNegativeInteger(saved.skillPoints);
    this.skillPointsBought = nonNegativeInteger(saved.skillPointsBought);
    // Older saves stored levels up to 20 (bought with collisions); any level
    // now just means "unlocked". Their `collisionBank` is no longer used.
    for (const [id, level] of Object.entries(saved.skills ?? {})) {
      if (this.byId.has(id) && nonNegativeInteger(level) > 0) this.levels[id] = 1;
    }
  }
}

export default SkillShop;
