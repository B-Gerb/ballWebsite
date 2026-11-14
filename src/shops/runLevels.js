import { SKILL_CHOICES } from '../data/skillTree.js';

/** Collisions needed for level 0 → 1; each level needs `LEVEL_XP_GROWTH` × more. */
export const LEVEL_XP_BASE = 500;
export const LEVEL_XP_GROWTH = 1.2;
/** How many choices a level-up offers. */
export const OFFER_SIZE = 3;

const nonNegative = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const nonNegativeInteger = (value) => Math.floor(nonNegative(value));

/**
 * The per-prestige level bar. Shape collisions fill it; each level-up banks a
 * pick. A pick offers `OFFER_SIZE` random choices from the unlocked skills,
 * and the chosen one stacks until the next prestige.
 *
 * The offer is stored, so closing and reopening it (or reloading the page)
 * never rerolls it.
 */
class RunLevels {
  constructor({ choices = SKILL_CHOICES, rng = Math.random } = {}) {
    this.choices = choices;
    this.byId = new Map(choices.map((c) => [c.id, c]));
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.level = 0;
    this.xp = 0;
    this.pendingPicks = 0;
    this.offer = null;
    this.picks = {};
  }

  xpToNext(level = this.level) {
    return Math.round(LEVEL_XP_BASE * LEVEL_XP_GROWTH ** level);
  }

  /** Add XP; returns how many levels were gained. */
  addXp(amount) {
    this.xp += nonNegative(amount);
    let gained = 0;
    // Cap the loop so one absurd frame can't stall the game.
    while (this.xp >= this.xpToNext() && gained < 100) {
      this.xp -= this.xpToNext();
      this.level += 1;
      this.pendingPicks += 1;
      gained += 1;
    }
    return gained;
  }

  stacks(choiceId) {
    return this.picks[choiceId] ?? 0;
  }

  /** Choices from unlocked skills that can still stack. */
  pool(unlockedSkillIds) {
    const unlocked = new Set(unlockedSkillIds);
    return this.choices.filter(
      (c) => unlocked.has(c.skillId) && this.stacks(c.id) < (c.maxStacks ?? Infinity),
    );
  }

  /**
   * The current offer (choice ids), drawing a new one if a pick is waiting.
   * Returns [] when a pick is waiting but every choice is maxed, and null
   * when no pick is waiting.
   */
  currentOffer(unlockedSkillIds) {
    if (this.pendingPicks <= 0) return null;
    const pool = this.pool(unlockedSkillIds);
    const stillValid = this.offer?.filter((id) => pool.some((c) => c.id === id));
    if (stillValid?.length) return stillValid;

    const deck = [...pool];
    const offer = [];
    while (offer.length < OFFER_SIZE && deck.length) {
      const index = Math.floor(this.rng() * deck.length) % deck.length;
      offer.push(deck.splice(index, 1)[0].id);
    }
    this.offer = offer;
    return offer;
  }

  /** Take one of the offered choices. */
  choose(choiceId, unlockedSkillIds) {
    const offer = this.currentOffer(unlockedSkillIds);
    if (!offer?.includes(choiceId)) return false;
    this.picks[choiceId] = this.stacks(choiceId) + 1;
    this.pendingPicks -= 1;
    this.offer = null;
    return true;
  }

  toJSON() {
    return {
      level: this.level,
      xp: this.xp,
      pendingPicks: this.pendingPicks,
      offer: this.offer,
      picks: { ...this.picks },
    };
  }

  load(saved) {
    this.reset();
    if (!saved || typeof saved !== 'object') return;
    this.level = nonNegativeInteger(saved.level);
    this.xp = nonNegative(saved.xp);
    this.pendingPicks = nonNegativeInteger(saved.pendingPicks);
    if (Array.isArray(saved.offer)) {
      this.offer = saved.offer.filter((id) => this.byId.has(id)).slice(0, OFFER_SIZE);
    }
    for (const [id, stacks] of Object.entries(saved.picks ?? {})) {
      const choice = this.byId.get(id);
      if (choice) this.picks[id] = Math.min(choice.maxStacks ?? Infinity, nonNegativeInteger(stacks));
    }
  }
}

export default RunLevels;
