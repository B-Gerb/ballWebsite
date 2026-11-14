import { MAX_RANK, SKILL_NODES, skillEffects } from '../data/skillTree.js';
import { normalizeRequirement } from '../components/whiteboard/graphLayout.js';

export { MAX_RANK };

/** One-time prestige-point price of opening the Skills tab. */
export const SKILLS_UNLOCK_COST = 25000;
/** Prestige-point price of the first skill point; ×1.75 every purchase. */
export const SKILL_POINT_BASE_PRICE = 2500;
export const SKILL_POINT_PRICE_GROWTH = 1.75;

const nonNegative = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const nonNegativeInteger = (value) => Math.floor(nonNegative(value));

/**
 * Permanent skill progress: which skills are unlocked and at what rank.
 * Spends prestige points through the prestige shop you pass in, so it never
 * holds a second copy of that balance. Run-only upgrades live in `RunLevels`.
 *
 * Ranks: 0 = locked, 1 = unlocked, up to MAX_RANK. Rank r -> r + 1 costs
 * r + 1 skill points unless the node lists its own `rankCosts`.
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
    this.ranks = {};
  }

  /** 0 when locked, else 1..MAX_RANK. */
  rank(id) {
    return this.ranks[id] ?? 0;
  }

  /** 1 when the skill is unlocked, else 0 (the level `requires` checks). */
  level(id) {
    return this.rank(id) > 0 ? 1 : 0;
  }

  isSkillUnlocked(id) {
    return this.rank(id) > 0;
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

  /** Prestige points for the next skill point; `priceMultiplier` is a discount (e.g. 0.7). */
  skillPointPrice(priceMultiplier = 1) {
    const multiplier = Number.isFinite(priceMultiplier) && priceMultiplier > 0 ? priceMultiplier : 1;
    return Math.round(SKILL_POINT_BASE_PRICE * SKILL_POINT_PRICE_GROWTH ** this.skillPointsBought * multiplier);
  }

  buySkillPoint(prestigeShop, priceMultiplier = 1) {
    const price = this.skillPointPrice(priceMultiplier);
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

  /** Skill points for the next unlock / rank-up, or null at max rank / unknown. */
  nextCost(id) {
    const node = this.byId.get(id);
    if (!node) return null;
    const rank = this.rank(id);
    if (rank >= MAX_RANK) return null;
    const amount = rank === 0 ? node.unlockCost ?? 1 : node.rankCosts?.[rank - 1] ?? rank + 1;
    return { currency: 'skillPoints', amount };
  }

  canAfford(cost) {
    return Boolean(cost) && this.skillPoints >= cost.amount;
  }

  /** Unlock a locked skill, or rank up an unlocked one, with skill points. */
  buy(id) {
    const cost = this.nextCost(id);
    if (!this.unlocked || !this.isAvailable(id) || !this.canAfford(cost)) return false;
    this.skillPoints -= cost.amount;
    this.ranks[id] = this.rank(id) + 1;
    return true;
  }

  /** Everything the UI needs for one node. */
  view(id) {
    const cost = this.nextCost(id);
    return {
      id,
      unlocked: this.isSkillUnlocked(id),
      rank: this.rank(id),
      maxRank: MAX_RANK,
      available: this.isAvailable(id),
      cost,
      canAfford: this.canAfford(cost),
    };
  }

  /** Base effects of unlocked skills (scaled by rank) plus this run's level-bar picks. */
  effects(picks = {}) {
    return skillEffects((id) => this.rank(id), picks, this.nodes);
  }

  toJSON() {
    const skills = {};
    for (const id of Object.keys(this.ranks)) skills[id] = 1;
    return {
      unlocked: this.unlocked,
      skillPoints: this.skillPoints,
      skillPointsBought: this.skillPointsBought,
      skills,
      ranks: { ...this.ranks },
    };
  }

  load(saved) {
    this.reset();
    if (!saved || typeof saved !== 'object') return;
    this.unlocked = saved.unlocked === true;
    this.skillPoints = nonNegativeInteger(saved.skillPoints);
    this.skillPointsBought = nonNegativeInteger(saved.skillPointsBought);
    // `skills` means "unlocked". Older saves stored levels up to 20 there
    // (bought with collisions); any level now just means rank 1. Their
    // `collisionBank` is no longer used. Ranks above 1 live in `ranks`.
    const savedRanks = saved.ranks && typeof saved.ranks === 'object' ? saved.ranks : {};
    for (const [id, level] of Object.entries(saved.skills ?? {})) {
      if (!this.byId.has(id) || nonNegativeInteger(level) <= 0) continue;
      this.ranks[id] = Math.min(MAX_RANK, Math.max(1, nonNegativeInteger(savedRanks[id])));
    }
  }
}

export default SkillShop;
